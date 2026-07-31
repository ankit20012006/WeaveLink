from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from web3 import Web3
from web3.exceptions import TransactionNotFound

from app.core.config import settings
from app.db.models import PassportAnchor, Product
from app.schemas.catalog import PassportAnchorPublic

WEAVE_PASSPORT_ABI: list[dict[str, Any]] = [
    {
        "inputs": [
            {"internalType": "address", "name": "recipient", "type": "address"},
            {"internalType": "string", "name": "passportId", "type": "string"},
            {"internalType": "bytes32", "name": "recordHash", "type": "bytes32"},
            {"internalType": "string", "name": "tokenUri", "type": "string"},
        ],
        "name": "mintPassport",
        "outputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "recipient", "type": "address"},
            {"indexed": True, "internalType": "bytes32", "name": "recordHash", "type": "bytes32"},
            {"indexed": False, "internalType": "string", "name": "passportId", "type": "string"},
            {"indexed": False, "internalType": "string", "name": "tokenUri", "type": "string"},
        ],
        "name": "PassportMinted",
        "type": "event",
    },
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def blockchain_is_configured() -> bool:
    return all(
        (
            settings.sepolia_rpc_url,
            settings.sepolia_private_key,
            settings.weave_passport_contract_address,
        )
    )


def canonical_product_record(product: Product) -> dict[str, object]:
    return {
        "schema": "weavelink.passport.v1",
        "productId": product.id,
        "serial": product.serial,
        "weaverId": product.weaver_id,
        "title": product.title,
        "category": product.category,
        "technique": product.technique,
        "materials": product.materials,
        "loomType": product.loom_type,
        "cluster": product.cluster,
        "gi": product.gi,
        "claimStatus": product.claim_status,
        "claimIssuer": product.claim_issuer,
        "claimIssuerRole": product.claim_issuer_role,
        "evidenceUrl": product.evidence_url,
        "originalAudioUrl": product.original_audio_url,
        "verificationMethod": product.verification_method,
        "verifiedAt": (
            product.verified_at.isoformat() if product.verified_at else None
        ),
        "productionRange": product.production_range,
        "storyTitle": product.story_title,
        "story": product.story,
        "images": list(product.images or []),
        "tags": list(product.tags or []),
    }


def product_record_hash(product: Product) -> str:
    encoded = json.dumps(
        canonical_product_record(product),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return f"0x{hashlib.sha256(encoded).hexdigest()}"


def build_passport_metadata(
    *,
    product: Product,
    weaver_name: str,
    record_hash: str,
) -> dict[str, object]:
    attributes: list[dict[str, object]] = [
        {"trait_type": "Artisan", "value": weaver_name},
        {"trait_type": "Cluster", "value": product.cluster},
        {"trait_type": "Technique", "value": product.technique},
        {"trait_type": "Loom", "value": product.loom_type},
        {"trait_type": "Materials", "value": product.materials},
        {"trait_type": "Passport serial", "value": product.serial},
        {"trait_type": "Record hash", "value": record_hash},
    ]
    if product.gi:
        attributes.append({"trait_type": "GI", "value": product.gi})

    image = product.images[0] if product.images else None
    if image and image.startswith("/"):
        image = f"{settings.frontend_url.rstrip('/')}{image}"

    return {
        "name": f"WeaveLink Passport: {product.title}",
        "description": (
            "Artisan-approved provenance evidence for a handloom product. "
            "This NFT timestamps the linked record; it is not automatic legal "
            "title or independent proof of physical authenticity."
        ),
        "image": image,
        "external_url": (
            f"{settings.frontend_url.rstrip('/')}/verify/{product.serial}"
        ),
        "attributes": attributes,
        "properties": {
            "schema": "weavelink.passport.v1",
            "canonicalRecord": canonical_product_record(product),
            "recordHash": record_hash,
        },
    }


def _web3() -> Web3:
    provider = Web3.HTTPProvider(
        settings.sepolia_rpc_url,
        request_kwargs={"timeout": 12},
    )
    return Web3(provider)


def _submit_mint_transaction(
    *,
    product_id: str,
    record_hash: str,
    recipient_address: str | None,
    token_uri: str,
) -> dict[str, str]:
    web3 = _web3()
    if not web3.is_connected():
        raise RuntimeError("Sepolia RPC is unavailable")
    if web3.eth.chain_id != settings.sepolia_chain_id:
        raise RuntimeError(
            f"RPC chain mismatch: expected {settings.sepolia_chain_id}, "
            f"received {web3.eth.chain_id}",
        )

    account = web3.eth.account.from_key(settings.sepolia_private_key)
    recipient = Web3.to_checksum_address(recipient_address or account.address)
    contract_address = Web3.to_checksum_address(
        settings.weave_passport_contract_address,
    )
    contract = web3.eth.contract(
        address=contract_address,
        abi=WEAVE_PASSPORT_ABI,
    )
    if not web3.eth.get_code(contract_address):
        raise RuntimeError("Configured passport contract is not deployed")
    contract_owner = Web3.to_checksum_address(contract.functions.owner().call())
    if contract_owner != Web3.to_checksum_address(account.address):
        raise RuntimeError("Configured signer is not the passport contract owner")

    nonce = web3.eth.get_transaction_count(account.address, "pending")
    pending_block = web3.eth.get_block("pending")
    base_fee = int(pending_block.get("baseFeePerGas") or web3.eth.gas_price)
    priority_fee = int(web3.eth.max_priority_fee)
    transaction = contract.functions.mintPassport(
        recipient,
        product_id,
        bytes.fromhex(record_hash.removeprefix("0x")),
        token_uri,
    ).build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "chainId": settings.sepolia_chain_id,
            "maxFeePerGas": base_fee * 2 + priority_fee,
            "maxPriorityFeePerGas": priority_fee,
        }
    )
    estimated_gas = web3.eth.estimate_gas(transaction)
    transaction["gas"] = max(estimated_gas * 12 // 10, estimated_gas)

    signed = web3.eth.account.sign_transaction(
        transaction,
        settings.sepolia_private_key,
    )
    transaction_hash = Web3.to_hex(
        web3.eth.send_raw_transaction(signed.raw_transaction),
    )
    return {
        "transaction_hash": transaction_hash,
        "recipient_address": recipient,
        "signer_address": account.address,
        "contract_address": contract_address,
    }


def _read_receipt(
    transaction_hash: str,
    contract_address: str,
    record_hash: str,
) -> dict[str, int] | None:
    web3 = _web3()
    try:
        receipt = web3.eth.get_transaction_receipt(transaction_hash)
    except TransactionNotFound:
        return None

    if int(receipt["status"]) != 1:
        return {
            "status": 0,
            "block_number": int(receipt["blockNumber"]),
            "token_id": 0,
            "confirmations": 0,
        }

    contract = web3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi=WEAVE_PASSPORT_ABI,
    )
    events = contract.events.PassportMinted().process_receipt(receipt)
    matching_events = [
        event
        for event in events
        if event["args"]["recordHash"].hex().removeprefix("0x").lower()
        == record_hash.removeprefix("0x").lower()
    ]
    token_id = int(matching_events[0]["args"]["tokenId"]) if matching_events else 0
    latest_block = int(web3.eth.block_number)
    confirmations = max(latest_block - int(receipt["blockNumber"]) + 1, 0)
    return {
        "status": 1,
        "block_number": int(receipt["blockNumber"]),
        "token_id": token_id,
        "confirmations": confirmations,
    }


def _to_public(anchor: PassportAnchor) -> PassportAnchorPublic:
    return PassportAnchorPublic(
        productId=anchor.product_id,
        status=anchor.status,
        recordHash=anchor.record_hash,
        chainId=anchor.chain_id,
        network=anchor.network,
        contractAddress=anchor.contract_address,
        recipientAddress=anchor.recipient_address,
        signerAddress=anchor.signer_address,
        tokenId=anchor.token_id,
        tokenUri=anchor.token_uri,
        transactionHash=anchor.transaction_hash,
        explorerUrl=(
            f"{settings.sepolia_explorer_url.rstrip('/')}/tx/"
            f"{anchor.transaction_hash}"
        ),
        contractExplorerUrl=(
            f"{settings.sepolia_explorer_url.rstrip('/')}/address/"
            f"{anchor.contract_address}"
        ),
        tokenExplorerUrl=(
            f"{settings.sepolia_explorer_url.rstrip('/')}/nft/"
            f"{anchor.contract_address}/{anchor.token_id}"
            if anchor.token_id is not None
            else None
        ),
        blockNumber=anchor.block_number,
        confirmations=anchor.confirmations,
        errorMessage=anchor.error_message,
        submittedAt=anchor.submitted_at,
        confirmedAt=anchor.confirmed_at,
    )


async def get_product_passport(
    *,
    db: AsyncSession,
    product_id: str,
    refresh: bool = True,
) -> PassportAnchorPublic | None:
    anchor = await db.get(PassportAnchor, product_id)
    if anchor is None:
        return None

    if refresh and anchor.status == "submitted" and blockchain_is_configured():
        receipt = await asyncio.to_thread(
            _read_receipt,
            anchor.transaction_hash,
            anchor.contract_address,
            anchor.record_hash,
        )
        if receipt is not None:
            anchor.block_number = receipt["block_number"]
            anchor.confirmations = receipt["confirmations"]
            anchor.updated_at = _now()
            if receipt["status"] == 1:
                anchor.token_id = receipt["token_id"] or None
                if (
                    receipt["token_id"]
                    and receipt["confirmations"]
                    >= settings.sepolia_confirmations_required
                ):
                    anchor.status = "confirmed"
                    anchor.confirmed_at = anchor.confirmed_at or _now()
            else:
                anchor.status = "failed"
                anchor.error_message = "Sepolia transaction reverted"
            await db.commit()
            await db.refresh(anchor)

    return _to_public(anchor)


async def mint_product_passport(
    *,
    db: AsyncSession,
    product: Product,
    owner_weaver_id: str,
    recipient_address: str | None,
    token_uri: str,
    metadata_snapshot: dict[str, object],
) -> PassportAnchorPublic:
    if product.weaver_id != owner_weaver_id:
        raise ValueError("Product unauthorized")
    if product.claim_status not in {
        "cooperative_verified",
        "gi_authority_verified",
    }:
        raise ValueError("Product must be approved before passport minting")
    if not blockchain_is_configured():
        raise RuntimeError("Sepolia passport minting is not configured")
    if recipient_address and not Web3.is_address(recipient_address):
        raise ValueError("Invalid recipient address")
    is_loopback_uri = token_uri.startswith(
        ("http://127.0.0.1:", "http://localhost:"),
    )
    if (
        settings.app_env == "production"
        and not token_uri.startswith("https://")
        and not is_loopback_uri
    ):
        raise RuntimeError("Production passport metadata URL must use HTTPS")

    record_hash = product_record_hash(product)
    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:product_id))"),
        {"product_id": product.id},
    )
    existing = await db.get(PassportAnchor, product.id)
    if existing is not None:
        if existing.record_hash != record_hash:
            raise ValueError(
                "Product changed after anchoring; create a versioned passport",
            )
        refreshed = await get_product_passport(
            db=db,
            product_id=product.id,
            refresh=True,
        )
        if refreshed is None:
            raise RuntimeError("Passport anchor could not be loaded")
        if refreshed.status != "failed":
            return refreshed

    submitted = await asyncio.to_thread(
        _submit_mint_transaction,
        product_id=product.id,
        record_hash=record_hash,
        recipient_address=recipient_address,
        token_uri=token_uri,
    )
    now = _now()
    snapshot = json.loads(json.dumps(metadata_snapshot))
    properties = snapshot.setdefault("properties", {})
    if isinstance(properties, dict):
        properties.update(
            {
                "transactionHash": submitted["transaction_hash"],
                "contractAddress": submitted["contract_address"],
                "chainId": settings.sepolia_chain_id,
            }
        )

    if existing is None:
        anchor = PassportAnchor(
            product_id=product.id,
            record_hash=record_hash,
            chain_id=settings.sepolia_chain_id,
            network="ethereum-sepolia",
            contract_address=submitted["contract_address"],
            recipient_address=submitted["recipient_address"],
            signer_address=submitted["signer_address"],
            token_uri=token_uri,
            canonical_record=canonical_product_record(product),
            metadata_snapshot=snapshot,
            transaction_hash=submitted["transaction_hash"],
            status="submitted",
            confirmations=0,
            submitted_at=now,
            updated_at=now,
        )
        db.add(anchor)
    else:
        anchor = existing
        anchor.contract_address = submitted["contract_address"]
        anchor.recipient_address = submitted["recipient_address"]
        anchor.signer_address = submitted["signer_address"]
        anchor.token_uri = token_uri
        anchor.canonical_record = canonical_product_record(product)
        anchor.metadata_snapshot = snapshot
        anchor.transaction_hash = submitted["transaction_hash"]
        anchor.status = "submitted"
        anchor.block_number = None
        anchor.confirmations = 0
        anchor.error_message = None
        anchor.submitted_at = now
        anchor.confirmed_at = None
        anchor.updated_at = now
    await db.commit()
    await db.refresh(anchor)
    return _to_public(anchor)
