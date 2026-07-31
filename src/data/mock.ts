export type InventoryStatus = "available" | "in-production" | "sold";

export type Weaver = {
  id: string;
  name: string;
  cluster: string;
  gi?: string;
  language: string;
  verified: boolean;
  photo: string;
  years: number;
  bio: string;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  bulkPrice: number;
  moq: number;
  category: string;
  technique: string;
  materials: string;
  loomType: string;
  cluster: string;
  gi?: string;
  status: InventoryStatus;
  authenticated: boolean;
  claimStatus?:
    | "draft"
    | "self_declared"
    | "evidence_submitted"
    | "cooperative_verified"
    | "gi_authority_verified"
    | "revoked";
  claimIssuer?: string | null;
  claimIssuerRole?: string | null;
  evidenceUrl?: string | null;
  originalAudioUrl?: string | null;
  verificationMethod?: string | null;
  verifiedAt?: string | null;
  claimExpiresAt?: string | null;
  serial: string;
  weaverId: string;
  images: string[];
  story: string;
  storyTitle: string;
  tags: string[];
  productionRange: string;
};

export type Order = {
  id: string;
  productTitle: string;
  buyer: string;
  type: "B2C" | "B2B";
  amount: number;
  status: "pending" | "shipped" | "settled";
  date: string;
};

export const weavers: Weaver[] = [
  {
    id: "w-lakshmi",
    name: "Lakshmi Devi",
    cluster: "Kanchipuram, Tamil Nadu",
    gi: "Kanchipuram Silk",
    language: "Tamil",
    verified: true,
    photo:
      "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80",
    years: 28,
    bio: "Third-generation silk weaver. Works a pit loom with her sister in a two-loom shed behind their home.",
  },
  {
    id: "w-ramesh",
    name: "Ramesh Meher",
    cluster: "Sambalpur, Odisha",
    gi: "Sambalpuri Ikat",
    language: "Odia",
    verified: true,
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    years: 19,
    bio: "Bandha master known for natural indigo resists. Sells with a 12-member SHG cooperative.",
  },
  {
    id: "w-meena",
    name: "Meena Bai",
    cluster: "Maheshwar, Madhya Pradesh",
    gi: "Maheshwari",
    language: "Hindi",
    verified: true,
    photo:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
    years: 14,
    bio: "Specialises in reversible borders and cotton–silk blends for contemporary wearers.",
  },
];

export const products: Product[] = [
  {
    id: "p-kanchi-maroon",
    title: "Temple Border Kanchipuram Silk Saree",
    price: 18500,
    bulkPrice: 15200,
    moq: 6,
    category: "Saree",
    technique: "Korvai",
    materials: "Mulberry silk, zari",
    loomType: "Pit loom",
    cluster: "Kanchipuram",
    gi: "Kanchipuram Silk",
    status: "available",
    authenticated: true,
    serial: "WL-KAN-2026-08421",
    weaverId: "w-lakshmi",
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80",
      "https://images.unsplash.com/photo-1596704017254-9b121068fb74?w=1200&q=80",
    ],
    storyTitle: "Journey of this saree",
    story:
      "Lakshmi began this piece after the monsoon harvest. The body is dyed in madder; the temple border took four days of korvai interlocking so the contrast never frays. Her grandmother’s motif book still sits beside the loom.",
    tags: ["silk", "bridal", "GI", "authenticated"],
    productionRange: "May–June 2026",
  },
  {
    id: "p-sambal-indigo",
    title: "Natural Indigo Sambalpuri Ikat Stole",
    price: 4200,
    bulkPrice: 3400,
    moq: 20,
    category: "Stole",
    technique: "Bandha (ikat)",
    materials: "Handspun cotton, natural indigo",
    loomType: "Frame loom",
    cluster: "Sambalpur",
    gi: "Sambalpuri Ikat",
    status: "available",
    authenticated: true,
    serial: "WL-SAM-2026-01933",
    weaverId: "w-ramesh",
    images: [
      "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1200&q=80",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&q=80",
    ],
    storyTitle: "Natural dye process",
    story:
      "Yarn was tied and dipped seven times in a vat fed by indigo leaves from Ramesh’s courtyard. The cloud motif is a family signature — each stole carries a unique tie map photographed into its Digital Product Passport.",
    tags: ["indigo", "cotton", "natural dye", "B2B-ready"],
    productionRange: "April 2026",
  },
  {
    id: "p-mahesh-check",
    title: "Reversible Maheshwari Cotton–Silk",
    price: 6800,
    bulkPrice: 5400,
    moq: 12,
    category: "Saree",
    technique: "Reversible border",
    materials: "Cotton–silk blend",
    loomType: "Fly-shuttle loom",
    cluster: "Maheshwar",
    gi: "Maheshwari",
    status: "in-production",
    authenticated: true,
    serial: "WL-MAH-2026-03110",
    weaverId: "w-meena",
    images: [
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80",
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=1200&q=80",
    ],
    storyTitle: "My family loom",
    story:
      "Meena’s loom faces the Narmada. This check uses a lighter weft for summer drape; the border reverses cleanly so the saree can be worn two ways — a quiet innovation she refined with boutique buyers in Indore.",
    tags: ["lightweight", "everyday", "verified weaver"],
    productionRange: "June–July 2026",
  },
  {
    id: "p-kanchi-gold",
    title: "Wedding Pallu Kanchipuram",
    price: 24500,
    bulkPrice: 19800,
    moq: 4,
    category: "Saree",
    technique: "Extra-weft brocade",
    materials: "Mulberry silk, pure zari",
    loomType: "Pit loom",
    cluster: "Kanchipuram",
    gi: "Kanchipuram Silk",
    status: "available",
    authenticated: true,
    serial: "WL-KAN-2026-08488",
    weaverId: "w-lakshmi",
    images: [
      "https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=1200&q=80",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80",
    ],
    storyTitle: "Journey of this saree",
    story:
      "Commissioned for a Chennai wedding season. The peacock pallu alone took eleven days. Authenticity serial is NFC-ready for the cooperative’s premium line.",
    tags: ["bridal", "zari", "premium"],
    productionRange: "March–April 2026",
  },
  {
    id: "p-sambal-runner",
    title: "Ikat Table Runner Set (pair)",
    price: 3100,
    bulkPrice: 2400,
    moq: 30,
    category: "Home",
    technique: "Bandha",
    materials: "Cotton",
    loomType: "Frame loom",
    cluster: "Sambalpur",
    gi: "Sambalpuri Ikat",
    status: "available",
    authenticated: true,
    serial: "WL-SAM-2026-02001",
    weaverId: "w-ramesh",
    images: [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
      "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1200&q=80",
    ],
    storyTitle: "Natural dye process",
    story:
      "Designed for boutique hotels and gifting. Same bandha discipline as apparel — each runner’s passport logs dye lot and weaver credit for the SHG.",
    tags: ["B2B", "gifting", "home"],
    productionRange: "May 2026",
  },
  {
    id: "p-mahesh-dupatta",
    title: "Maheshwari Dupatta — River Mist",
    price: 2900,
    bulkPrice: 2200,
    moq: 25,
    category: "Dupatta",
    technique: "Plain weave with border",
    materials: "Cotton–silk",
    loomType: "Fly-shuttle loom",
    cluster: "Maheshwar",
    gi: "Maheshwari",
    status: "available",
    authenticated: true,
    serial: "WL-MAH-2026-03155",
    weaverId: "w-meena",
    images: [
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&q=80",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80",
    ],
    storyTitle: "My family loom",
    story:
      "A lighter piece for everyday wear. Meena records a short voice note in Hindi for every listing — WeaveLink turns it into a bilingual story buyers can read or hear.",
    tags: ["everyday", "voice-story"],
    productionRange: "June 2026",
  },
];

export const orders: Order[] = [
  {
    id: "ORD-1042",
    productTitle: "Natural Indigo Sambalpuri Ikat Stole",
    buyer: "Aarohi Design Co.",
    type: "B2B",
    amount: 68000,
    status: "pending",
    date: "18 Jul 2026",
  },
  {
    id: "ORD-1038",
    productTitle: "Temple Border Kanchipuram Silk Saree",
    buyer: "Priya S.",
    type: "B2C",
    amount: 18500,
    status: "shipped",
    date: "16 Jul 2026",
  },
  {
    id: "ORD-1031",
    productTitle: "Ikat Table Runner Set (pair)",
    buyer: "Hotel Indigo Goa",
    type: "B2B",
    amount: 72000,
    status: "settled",
    date: "12 Jul 2026",
  },
  {
    id: "ORD-1029",
    productTitle: "Maheshwari Dupatta — River Mist",
    buyer: "Neha Kapoor",
    type: "B2C",
    amount: 2900,
    status: "settled",
    date: "10 Jul 2026",
  },
];

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export function getWeaver(id: string) {
  return weavers.find((w) => w.id === id);
}

export function getProductBySerial(serial: string) {
  return products.find(
    (p) => p.serial.toLowerCase() === decodeURIComponent(serial).toLowerCase(),
  );
}

export const clusters = [
  "All clusters",
  "Kanchipuram",
  "Sambalpur",
  "Maheshwar",
] as const;

export const techniques = [
  "All techniques",
  "Korvai",
  "Bandha (ikat)",
  "Reversible border",
  "Extra-weft brocade",
  "Plain weave with border",
] as const;

export const categories = [
  "All categories",
  "Saree",
  "Stole",
  "Home",
  "Dupatta",
] as const;
