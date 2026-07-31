"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const supportedLocales = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "hi", label: "हिन्दी", shortLabel: "हि" },
  { code: "ta", label: "தமிழ்", shortLabel: "த" },
  { code: "or", label: "ଓଡ଼ିଆ", shortLabel: "ଓ" },
] as const;

export type Locale = (typeof supportedLocales)[number]["code"];

const englishMessages = {
  "nav.marketplace": "Marketplace",
  "nav.b2b": "B2B",
  "nav.list": "List",
  "nav.seller": "Seller",
  "nav.verify": "Verify",
  "nav.learn": "Learn",
  "nav.startListing": "Start listing",
  "language.label": "Interface language",
  "home.heroTitle": "Handloom identity, capacity, and value — made visible.",
  "home.heroBody":
    "One regional-language story becomes a portable catalog, a provenance record, and a capacity-aware path to real buyers.",
  "home.browse": "Browse authenticated pieces",
  "home.tryVoice": "Try voice listing",
  "home.howLabel": "How it works",
  "home.howTitle": "From loom to trusted buyer in three steps",
  "home.step": "Step",
  "home.step1Title": "Voice or photo listing",
  "home.step1Body":
    "Speak in your language or add photos. AI assists with the draft; the artisan reviews every product fact and story.",
  "home.step2Title": "Record provenance",
  "home.step2Body":
    "Credit the artisan, contributors, cluster, evidence, and verifier in a versioned Digital Product Passport.",
  "home.step3Title": "Offer real capacity",
  "home.step3Body":
    "Sell ready stock or respond to small-batch inquiries with honest quantity, variation, lead time, and payout.",
  "home.storiesTitle": "Stories that travel with the cloth",
  "home.storiesBody":
    "A short voice note from the weaver becomes a reviewed multilingual product story on the storefront and every passport scan.",
  "home.readStory": "Read a sample story",
  "home.scanPassport": "Scan a passport",
} as const;

export type MessageKey = keyof typeof englishMessages;

const messages: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en: englishMessages,
  hi: {
    "nav.marketplace": "बाज़ार",
    "nav.b2b": "थोक",
    "nav.list": "सूची बनाएँ",
    "nav.seller": "विक्रेता",
    "nav.verify": "सत्यापन",
    "nav.learn": "सीखें",
    "nav.startListing": "उत्पाद जोड़ें",
    "language.label": "इंटरफ़ेस भाषा",
    "home.heroTitle": "हथकरघा की पहचान, क्षमता और उचित मूल्य — सब स्पष्ट।",
    "home.heroBody":
      "आपकी भाषा की एक कहानी से साझा करने योग्य कैटलॉग, स्रोत रिकॉर्ड और वास्तविक खरीदारों तक पहुँच बनती है।",
    "home.browse": "प्रामाणिक उत्पाद देखें",
    "home.tryVoice": "आवाज़ से सूची बनाएँ",
    "home.howLabel": "यह कैसे काम करता है",
    "home.howTitle": "करघे से भरोसेमंद खरीदार तक, तीन सरल कदम",
    "home.step": "चरण",
    "home.step1Title": "आवाज़ या फोटो से सूची",
    "home.step1Body":
      "अपनी भाषा में बोलें या फोटो जोड़ें। AI मसौदा तैयार करता है; कारीगर हर तथ्य और कहानी की समीक्षा करता है।",
    "home.step2Title": "उत्पत्ति दर्ज करें",
    "home.step2Body":
      "कारीगर, सहयोगियों, क्लस्टर, प्रमाण और सत्यापनकर्ता को संस्करण वाले डिजिटल उत्पाद पासपोर्ट में श्रेय दें।",
    "home.step3Title": "वास्तविक क्षमता बताएँ",
    "home.step3Body":
      "तैयार माल बेचें या सही मात्रा, बदलाव, समय और भुगतान के साथ छोटे बैच का प्रस्ताव दें।",
    "home.storiesTitle": "कपड़े के साथ चलने वाली कहानियाँ",
    "home.storiesBody":
      "बुनकर की छोटी आवाज़ रिकॉर्डिंग से समीक्षा की गई बहुभाषी कहानी बनती है, जो दुकान और पासपोर्ट दोनों पर दिखती है।",
    "home.readStory": "एक नमूना कहानी पढ़ें",
    "home.scanPassport": "पासपोर्ट स्कैन करें",
  },
  ta: {
    "nav.marketplace": "சந்தை",
    "nav.b2b": "மொத்தம்",
    "nav.list": "பட்டியல்",
    "nav.seller": "விற்பனையாளர்",
    "nav.verify": "சரிபார்",
    "nav.learn": "கற்க",
    "nav.startListing": "பொருளைச் சேர்க்க",
    "language.label": "இடைமுக மொழி",
    "home.heroTitle":
      "கைத்தறியின் அடையாளம், உற்பத்தித் திறன், மதிப்பு — அனைத்தும் தெளிவாக.",
    "home.heroBody":
      "உங்கள் மொழியில் ஒரு கதை, பகிரக்கூடிய பட்டியல், மூலப் பதிவு மற்றும் உண்மையான வாங்குபவர்களுக்கான பாதையாக மாறுகிறது.",
    "home.browse": "உறுதிப்படுத்தப்பட்ட பொருட்களைப் பார்க்க",
    "home.tryVoice": "குரல் மூலம் பட்டியலிட",
    "home.howLabel": "இது எப்படி செயல்படுகிறது",
    "home.howTitle": "தறியிலிருந்து நம்பகமான வாங்குபவருக்கு மூன்று படிகள்",
    "home.step": "படி",
    "home.step1Title": "குரல் அல்லது படம் மூலம் பட்டியல்",
    "home.step1Body":
      "உங்கள் மொழியில் பேசுங்கள் அல்லது படங்களைச் சேருங்கள். AI வரைவை உருவாக்க உதவும்; கைவினைஞர் ஒவ்வொரு தகவலையும் கதையையும் சரிபார்ப்பார்.",
    "home.step2Title": "மூலத்தைப் பதிவு செய்யுங்கள்",
    "home.step2Body":
      "கைவினைஞர், பங்களிப்பாளர்கள், குழுமம், ஆதாரம் மற்றும் சரிபார்ப்பவரை பதிப்பு கொண்ட டிஜிட்டல் பாஸ்போர்ட்டில் பதிவு செய்யுங்கள்.",
    "home.step3Title": "உண்மையான திறனை வழங்குங்கள்",
    "home.step3Body":
      "தயார் பொருளை விற்கவும் அல்லது நேர்மையான அளவு, மாறுபாடு, காலக்கெடு மற்றும் பணப்பங்குடன் சிறு தொகுதி கோரிக்கைக்கு பதிலளிக்கவும்.",
    "home.storiesTitle": "துணியுடன் பயணிக்கும் கதைகள்",
    "home.storiesBody":
      "நெசவாளரின் சிறிய குரல் பதிவு, மதிப்பாய்வு செய்யப்பட்ட பல்மொழிக் கதையாக கடையிலும் பாஸ்போர்ட் ஸ்கேனிலும் தோன்றும்.",
    "home.readStory": "மாதிரி கதையைப் படிக்க",
    "home.scanPassport": "பாஸ்போர்ட்டை ஸ்கேன் செய்ய",
  },
  or: {
    "nav.marketplace": "ବଜାର",
    "nav.b2b": "ପାଇକାରୀ",
    "nav.list": "ତାଲିକା",
    "nav.seller": "ବିକ୍ରେତା",
    "nav.verify": "ଯାଞ୍ଚ",
    "nav.learn": "ଶିଖନ୍ତୁ",
    "nav.startListing": "ଉତ୍ପାଦ ଯୋଡ଼ନ୍ତୁ",
    "language.label": "ଇଣ୍ଟରଫେସ୍ ଭାଷା",
    "home.heroTitle": "ହସ୍ତତନ୍ତର ପରିଚୟ, କ୍ଷମତା ଓ ମୂଲ୍ୟ — ସବୁ ସ୍ପଷ୍ଟ।",
    "home.heroBody":
      "ଆପଣଙ୍କ ଭାଷାର ଗୋଟିଏ କାହାଣୀ ସହଜରେ ବାଣ୍ଟିହେବା କ୍ୟାଟାଲଗ୍, ଉତ୍ସ ରେକର୍ଡ ଓ ପ୍ରକୃତ କ୍ରେତାଙ୍କ ପଥ ହୁଏ।",
    "home.browse": "ପ୍ରମାଣିତ ଉତ୍ପାଦ ଦେଖନ୍ତୁ",
    "home.tryVoice": "କଣ୍ଠସ୍ୱରରେ ତାଲିକା କରନ୍ତୁ",
    "home.howLabel": "ଏହା କିପରି କାମ କରେ",
    "home.howTitle": "ତନ୍ତରୁ ବିଶ୍ୱସ୍ତ କ୍ରେତା ପର୍ଯ୍ୟନ୍ତ ତିନୋଟି ସରଳ ପଦକ୍ଷେପ",
    "home.step": "ପଦକ୍ଷେପ",
    "home.step1Title": "କଣ୍ଠସ୍ୱର କିମ୍ବା ଫଟୋରେ ତାଲିକା",
    "home.step1Body":
      "ନିଜ ଭାଷାରେ କୁହନ୍ତୁ କିମ୍ବା ଫଟୋ ଯୋଡ଼ନ୍ତୁ। AI ଖସଡ଼ାରେ ସାହାଯ୍ୟ କରେ; କାରିଗର ପ୍ରତ୍ୟେକ ତଥ୍ୟ ଓ କାହାଣୀ ଯାଞ୍ଚ କରନ୍ତି।",
    "home.step2Title": "ଉତ୍ସ ରେକର୍ଡ କରନ୍ତୁ",
    "home.step2Body":
      "କାରିଗର, ସହଯୋଗୀ, କ୍ଲଷ୍ଟର, ପ୍ରମାଣ ଓ ଯାଞ୍ଚକାରୀଙ୍କୁ ସଂସ୍କରଣଯୁକ୍ତ ଡିଜିଟାଲ ପାସପୋର୍ଟରେ ଶ୍ରେୟ ଦିଅନ୍ତୁ।",
    "home.step3Title": "ପ୍ରକୃତ କ୍ଷମତା ଦିଅନ୍ତୁ",
    "home.step3Body":
      "ପ୍ରସ୍ତୁତ ଉତ୍ପାଦ ବିକ୍ରି କରନ୍ତୁ କିମ୍ବା ଠିକ୍ ପରିମାଣ, ଭିନ୍ନତା, ସମୟ ଓ ପ୍ରାପ୍ୟ ସହ ଛୋଟ ବ୍ୟାଚ୍ ଅନୁରୋଧକୁ ଉତ୍ତର ଦିଅନ୍ତୁ।",
    "home.storiesTitle": "କପଡ଼ା ସହ ଯାତ୍ରା କରୁଥିବା କାହାଣୀ",
    "home.storiesBody":
      "ବୁଣାକାରଙ୍କ ଛୋଟ କଣ୍ଠ ରେକର୍ଡିଂ ସମୀକ୍ଷିତ ବହୁଭାଷୀ କାହାଣୀ ହୋଇ ଦୋକାନ ଓ ପାସପୋର୍ଟ ସ୍କାନରେ ଦେଖାଯାଏ।",
    "home.readStory": "ନମୁନା କାହାଣୀ ପଢ଼ନ୍ତୁ",
    "home.scanPassport": "ପାସପୋର୍ଟ ସ୍କାନ୍ କରନ୍ତୁ",
  },
};

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    try {
      window.localStorage.setItem("weavelink_locale", nextLocale);
    } catch {
      // Language selection still works when browser storage is unavailable.
    }
  }, []);

  const t = useCallback(
    (key: MessageKey) => messages[locale][key] ?? englishMessages[key],
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
