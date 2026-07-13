import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ta";

export const TA: Record<string, string> = {
  // Navbar
  "Bulk Order": "மொத்த ஆர்டர்",
  "Track Order": "ஆர்டர் கண்காணிப்பு",
  "Deliver to": "டெலிவரி இடம்",
  "Set location": "இடத்தை அமைக்கவும்",
  "My Orders": "என் ஆர்டர்கள்",
  "My Profile": "என் சுயவிவரம்",
  "Admin Dashboard": "நிர்வாக டாஷ்போர்டு",
  "Delivery Dashboard": "டெலிவரி டாஷ்போர்டு",
  "Logout": "வெளியேறு",
  "Sign in": "உள்நுழைவு",
  "Menu": "மெனு",
  // Address modal
  "Delivery Location": "டெலிவரி இடம்",
  "Where should we deliver?": "நாங்கள் எங்கு டெலிவரி செய்ய வேண்டும்?",
  "Use my location": "என் இடத்தை பயன்படுத்து",
  "Fetching your location…": "இடம் கண்டறிகிறோம்…",
  "Saved": "சேமிக்கப்பட்டவை",
  "Add New Address": "புதிய முகவரி சேர்",
  "Flat / House No.": "வீட்டு எண்",
  "Street No.": "தெரு எண்",
  "Street Name": "தெரு பெயர்",
  "Area / Locality": "பகுதி",
  "Near Landmark": "அருகிலுள்ள இடம்",
  "Save as": "இவ்வாறு சேமி",
  "Home": "முகப்பு",
  "Work": "வேலை",
  "Other": "மற்றவை",
  "Saving…": "சேமிக்கிறோம்…",
  "Save Address": "முகவரி சேமி",
  "Sign in to save addresses": "முகவரிகளை சேமிக்க உள்நுழையவும்",
  "to save addresses": "முகவரிகளை சேமிக்க",
  // Hero
  "Hotel-quality. Delivered in 30 min.": "ஹோட்டல் தரம். 30 நிமிடத்தில் டெலிவரி.",
  "Crave it.": "ஆசைப்படு.",
  "Tap it.": "தட்டு.",
  "Devour it.": "சாப்பிடு.",
  "Welcome to SAM — one hotel, a hundred reasons to stay hungry. From fresh dosas to event-scale catering, we deliver the moment you call.": "SAM-க்கு வரவேற்கிறோம் — ஒரு ஹோட்டல், நூறு காரணங்கள். புதிய தோசைகளிலிருந்து நிகழ்வு கேட்டரிங் வரை, நீங்கள் அழைத்த உடனே டெலிவரி செய்கிறோம்.",
  "Order Now": "இப்போதே ஆர்டர் செய்",
  "Bulk Booking": "மொத்த பதிவு",
  // Menu section
  "The Menu": "மெனு",
  "Today on the pass": "இன்றைய சிறப்பு",
  "Search dishes…": "உணவுகளை தேடுங்கள்…",
  "100% Pure Veg": "100% தூய சைவம்",
  "Popular": "பிரபலம்",
  "Top rated": "உயர் மதிப்பீடு",
  "Price: Low to High": "விலை: குறைவிலிருந்து அதிகம்",
  "Price: High to Low": "விலை: அதிகத்திலிருந்து குறைவு",
  "All": "அனைத்தும்",
  "No dishes match your search.": "உங்கள் தேடலுக்கு பொருந்தும் உணவுகள் இல்லை.",
  "No dishes available right now.": "இப்போது உணவுகள் எதுவும் இல்லை.",
  "Rise & Shine": "காலை உணவு",
  "Rice & Biryani Varieties": "சோறு & பிரியாணி வகைகள்",
  "Full & Half Meals": "முழு & பாதி சாப்பாடு",
  "Snacks & Starters": "சிற்றுண்டி & ஸ்டார்டர்ஸ்",
  "Sweet Endings": "இனிப்புகள்",
  "Breakfast": "காலை உணவு",
  "Briyani": "பிரியாணி",
  "Meals": "சாப்பாடு",
  "Starters": "ஸ்டார்டர்ஸ்",
  "Desserts": "இனிப்புகள்",
  "items": "உணவுகள்",
  "item": "உணவு",
  // Reviews
  "Loved by our regulars": "நம் வழக்கமான வாடிக்கையாளர்கள் விரும்பியது",
  "Real reviews. Real plates.": "உண்மையான மதிப்புரைகள். உண்மையான தட்டுகள்.",
  "Update your review": "உங்கள் மதிப்புரையை புதுப்பிக்கவும்",
  "Write a review": "மதிப்புரை எழுதுங்கள்",
  "Your rating": "உங்கள் மதிப்பீடு",
  "You are a": "நீங்கள் ஒரு",
  "Customer": "வாடிக்கையாளர்",
  "Regular": "வழக்கமானவர்",
  "Event Host": "நிகழ்வு நடத்துபவர்",
  "Office Order": "அலுவலக ஆர்டர்",
  "Share your experience…": "உங்கள் அனுபவத்தை பகிருங்கள்…",
  "Please select a star rating.": "நட்சத்திர மதிப்பீட்டை தேர்ந்தெடுக்கவும்.",
  "Please write something.": "ஏதாவது எழுதுங்கள்.",
  "Review submitted! Thank you ❤️": "மதிப்புரை சமர்ப்பிக்கப்பட்டது! நன்றி ❤️",
  "Failed to submit.": "சமர்ப்பிக்க முடியவில்லை.",
  "Submitting…": "சமர்ப்பிக்கிறோம்…",
  "Update review": "மதிப்புரையை புதுப்பி",
  "Submit review": "மதிப்புரை சமர்ப்பி",
  "Sign in to leave a review.": "மதிப்புரை இட உள்நுழையவும்.",
  "No reviews yet. Be the first!": "இன்னும் மதிப்புரைகள் இல்லை. முதலில் இரு!",
  "Your review": "உங்கள் மதிப்புரை",
  "to leave a review.": "மதிப்புரை இட உள்நுழையவும்.",
  // Cart page
  "Your cart": "உங்கள் கார்ட்",
  "Review your dishes before we fire the kitchen.": "சமையலறையை தொடங்கும் முன் உங்கள் உணவுகளை சரிபாருங்கள்.",
  "100% Pure Veg checkout": "100% தூய சைவ செக்அவுட்",
  "Your cart is empty.": "உங்கள் கார்ட் காலியாக உள்ளது.",
  "Hungry? Add a few dishes to get started.": "பசிக்கிறதா? தொடங்க சில உணவுகளை சேர்க்கவும்.",
  "Browse menu": "மெனு பார்க்கவும்",
  "Clear cart": "கார்ட் அழி",
  "Sign in to place your order": "ஆர்டர் செய்ய உள்நுழையவும்",
  "Quick sign up — takes 30 seconds": "விரைவான பதிவு — 30 விநாடிகள் மட்டுமே",
  "Subtotal": "கூட்டுத்தொகை",
  "Delivery": "டெலிவரி",
  "free above ₹499": "₹499-க்கு மேல் இலவசம்",
  "Total": "மொத்தம்",
  "FREE": "இலவசம்",
  "Payment method": "பணம் செலுத்தும் முறை",
  "Cash": "பணம்",
  "GPay / UPI": "ஜிபே / யுபிஐ",
  "Delivery location": "டெலிவரி இடம்",
  "Use my current location": "என் தற்போதைய இடத்தை பயன்படுத்து",
  "Fetching location…": "இடம் கண்டறிகிறோம்…",
  "Saved addresses / Type address": "சேமிக்கப்பட்ட முகவரிகள் / முகவரி தட்டச்சு செய்",
  "Type your address…": "உங்கள் முகவரி தட்டச்சு செய்யுங்கள்…",
  "Use": "பயன்படுத்து",
  "✓ GPS confirmed — your address is saved": "✓ GPS உறுதிப்படுத்தப்பட்டது — முகவரி சேமிக்கப்பட்டது",
  "⚠️ GPay/UPI is not configured. Please use Cash on Delivery or contact support.": "⚠️ ஜிபே/யுபிஐ அமைக்கப்படவில்லை. பணமாக செலுத்தவும்.",
  "Placing order…": "ஆர்டர் செய்கிறோம்…",
  "Opening payment…": "பணம் செலுத்துகிறோம்…",
  "Pay with GPay / UPI": "ஜிபே / யுபிஐ மூலம் செலுத்து",
  "Place order": "ஆர்டர் செய்",
  "Secure · UPI / Cash on delivery": "பாதுகாப்பான · யுபிஐ / பணமாக செலுத்தும்",
  "Sign in to order": "ஆர்டர் செய்ய உள்நுழைவு",
  "You need an account to place an order. It only takes 30 seconds to sign up!": "ஆர்டர் செய்ய கணக்கு தேவை. பதிவு செய்ய 30 விநாடிகள் மட்டுமே!",
  "Sign in / Sign up": "உள்நுழைவு / பதிவு",
  "Back to cart": "கார்ட்டிற்கு திரும்பு",
  "Waiting for kitchen": "சமையலறையின் உறுதிப்படுத்தலுக்காக காத்திருக்கிறோம்",
  "Your order request has been sent to SAM kitchen. Hang tight — the chef will confirm shortly!": "உங்கள் ஆர்டர் SAM சமையலறைக்கு அனுப்பப்பட்டது. சற்று பொறுங்கள் — சமையல்காரர் விரைவில் உறுதிப்படுத்துவார்!",
  "Out of Delivery Radius": "டெலிவரி எல்லைக்கு வெளியே",
  "Sorry! SAM Foods only delivers within": "மன்னிக்கவும்! SAM Foods",
  "of the restaurant. Your location is outside our delivery zone.": "கி.மீ. வரையில் மட்டுமே டெலிவரி செய்கிறோம். உங்கள் இடம் வரம்பிற்கு வெளியே உள்ளது.",
  "Change Address": "முகவரி மாற்று",
  "Location Not Recognised": "இடம் கண்டறியப்படவில்லை",
  "We couldn't verify your delivery address. Please use": "உங்கள் டெலிவரி முகவரியை சரிபார்க்க முடியவில்லை. தயவுசெய்து",
  "(GPS) so we can confirm you're within our delivery zone.": "(GPS) பயன்படுத்தவும், நாங்கள் உங்கள் இடத்தை உறுதிப்படுத்துவோம்.",
  "\"Use my current location\"": "\"என் தற்போதைய இடத்தை பயன்படுத்து\"",
  "OK, Got it": "சரி, புரிந்தது",
  "Food sold out 😔": "உணவு தீர்ந்துவிட்டது 😔",
  "Sorry, the kitchen is unable to fulfil your order right now. Please come back tomorrow for fresh dishes!": "மன்னிக்கவும், இப்போது உங்கள் ஆர்டரை நிறைவேற்ற முடியவில்லை. புதிய உணவுகளுக்கு நாளை வாருங்கள்!",
  // Orders page
  "Account": "கணக்கு",
  "orders total": "மொத்த ஆர்டர்கள்",
  "order total": "மொத்த ஆர்டர்",
  "active orders in progress": "செயலில் உள்ள ஆர்டர்கள்",
  "active order in progress": "செயலில் உள்ள ஆர்டர்",
  "Track →": "கண்காணி →",
  "Placed": "பதிவு செய்யப்பட்டது",
  "Preparing": "தயாரிக்கிறோம்",
  "Delivered": "வழங்கப்பட்டது",
  "Cancelled": "ரத்து செய்யப்பட்டது",
  "No orders here yet.": "இன்னும் ஆர்டர்கள் இல்லை.",
  "Deliver to:": "டெலிவரி இடம்:",
  "Track order →": "ஆர்டர் கண்காணி →",
  "Reorder": "மீண்டும் ஆர்டர்",
  // FoodCard — food names
  "Idli (2 pcs)": "இட்லி (2 பிஸ்)",
  "Kal Dosa": "கல் தோசை",
  "NYC Dosa": "NYC தோசை",
  "Plain Dosa": "சாதா தோசை",
  "Masala Dosa": "மசால தோசை",
  "Podi Dosa": "பொடி தோசை",
  "Onion Uthappam": "வெங்காய உத்தப்பம்",
  "Onion Uththappam": "வெங்காய உத்தப்பம்",
  "Pongal": "பொங்கல்",
  "Kitchadi": "கிச்சடி",
  "Upma": "உப்மா",
  "Keerai Dosa": "கீரை தோசை",
  "Ravi Rotti": "ரவி ரொட்டி",
  "Mysore Masala Dosa": "மைசூர் மசால தோசை",
  "Thakkali Dosa": "தக்காளி தோசை",
  "Medu Vadai": "மேது வடை",
  "Kara Vadai": "கார வடை",
  "Full Meal": "முழு சாப்பாடு",
  "Half Meal": "பாதி சாப்பாடு",
  "Mushroom Biryani": "காளான் பிரியாணி",
  "Veg Biryani": "சைவ பிரியாணி",
  "Ghee Rice": "நெய் சோறு",
  "Tomato Rice": "தக்காளி சாதம்",
  "Curd Rice": "தயிர் சாதம்",
  "Lemon Rice": "எலுமிச்சை சாதம்",
  "Puli Rice": "புளி சாதம்",
  "Kothu Parota": "கொத்து பரோட்டா",
  "Kothu Parotta": "கொத்து பரோட்டா",
  "Kesari": "கேசரி",
  // food descriptions
  "Soft steamed rice cakes served with sambar & fresh coconut chutney.": "சாம்பார் & தேங்காய் சட்னியுடன் பரிமாறப்படும் மென்மையான இட்லி.",
  "Crispy dosa stuffed with spiced potato masala, served with sambar & chutney.": "உருளைக்கிழங்கு மசாலா நிரப்பப்பட்ட மொறுமொறுப்பான மசால தோசை.",
  "Crispy dosa with spicy red chutney base & potato masala filling.": "காரமான சிவப்பு சட்னி & உருளைக்கிழங்கு மசாலாவுடன் மொறுமொறுப்பான தோசை.",
  "Creamy rice and moong dal cooked with pepper, cumin, ghee & cashews.": "மிளகு, சீரகம், நெய் & முந்திரியுடன் சமைத்த கிரீமி பொங்கல்.",
  "Shredded flaky parota stir-fried with onion, tomato & spices.": "வெங்காயம், தக்காளி & மசாலாவுடன் வதக்கிய கொத்து பரோட்டா.",
  "Full South Indian thali — rice, sambar, rasam, 3 curries, papad, curd & sweet.": "முழு தென்னிந்திய தாலி — சோறு, சாம்பார், ரசம், 3 கறிகள், பப்பட்ம், தயிர் & இனிப்பு.",
  "Lighter South Indian meal — rice, sambar, 2 curries, papad & curd.": "இலகுவான தென்னிந்திய உணவு — சோறு, சாம்பார், 2 கறிகள், பப்பட்ம் & தயிர்.",
  "Fragrant basmati rice cooked with tender mushrooms & whole spices.": "காளான் & முழு மசாலாவுடன் சமைத்த வாசனையான பாஸ்மதி சோறு.",
  "Aromatic basmati rice with mixed vegetables, saffron & fried onions.": "காய்கறிகள், குங்குமப்பூ & வறுத்த வெங்காயத்துடன் வாசனையான பாஸ்மதி சோறு.",
  "Crispy urad dal doughnut fritters with a fluffy center. Served with chutney.": "மொறுமொறுப்பான உளுந்து வடை, சட்னியுடன் பரிமாறப்படுகிறது.",
  "Sweet semolina halwa with saffron, ghee, cashews & cardamom.": "குங்குமப்பூ, நெய், முந்திரி & ஏலக்காயுடன் இனிப்பான ரவா கேசரி.",
  // badge translations
  "Bestseller": "அதிகம் விற்பனையாவது",
  "Must Try": "கட்டாயம் சாப்பிட வேண்டும்",
  "Chef Special": "சமையல்காரர் சிறப்பு",
  "New": "புதியது",
  // price label
  "Price": "விலை",
  "A single hotel kitchen. Hand-crafted dishes. Delivered with care.": "ஒரு ஹோட்டல் சமையலறை. கைத்தொழில் உணவுகள். அன்புடன் வழங்கப்படுகிறது.",
  "Hours": "நேரம்",
  "Mon – Fri · 11:00 – 23:00": "திங்கள் – வெள்ளி · 11:00 – 23:00",
  "Sat – Sun · 10:00 – 24:00": "சனி – ஞாயிறு · 10:00 – 24:00",
  "Bulk orders · 24 / 7": "மொத்த ஆர்டர் · 24 / 7",
  "Reach Us": "எங்களை தொடர்பு கொள்",
  "Terms": "விதிமுறைகள்",
  "Privacy": "தனியுரிமை",
  "Refunds": "பணத்திரும்பல்",
  "All rights reserved.": "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
};

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem("sam_lang") as Lang) ?? "en"; } catch { return "en"; }
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("sam_lang", l); } catch {}
  };

  const t = (key: string): string => {
    if (lang === "en") return key;
    return TA[key] ?? key;
  };

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLanguage must be used inside LangProvider");
  return ctx;
}
