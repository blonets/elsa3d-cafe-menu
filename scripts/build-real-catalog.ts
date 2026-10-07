/**
 * Builds the REAL Elsa3d Cafe catalog XLSX from menusources_and_price/*.txt
 * (same 8-section division as the source files + section 9 as add-on groups).
 * Output: menusources_and_price/elsa3d-cafe-menu-catalog.xlsx
 */
import path from "node:path";
import fs from "node:fs";
import ExcelJS from "exceljs";
import {
  CATEGORY_HEADERS,
  ITEM_HEADERS,
  VARIANT_HEADERS,
  GROUP_HEADERS,
  ADDON_HEADERS,
  LINK_HEADERS,
} from "../src/lib/import/template";

/* ─────────────────────────── data model ─────────────────────────── */

type Variant = { ar: string; en: string; price: number };
type Item = {
  code: string;
  ar: string;
  en: string;
  price?: number;
  variants?: Variant[];
  descAr?: string;
  descEn?: string;
};
type Category = {
  slug: string;
  ar: string;
  en: string;
  icon: string;
  items: Item[];
};

const V = (ar: string, en: string, price: number): Variant => ({ ar, en, price });

const CATEGORIES: Category[] = [
  /* ═══ 1. المشروبات الساخنة والقهوة الكلاسيكية ═══ */
  {
    slug: "hot-drinks",
    ar: "مشروبات ساخنة وقهوة كلاسيكية",
    en: "Hot Drinks & Classic Coffee",
    icon: "coffee",
    items: [
      { code: "turkish-plain", ar: "قهوة تركي سادة", en: "Turkish Coffee (Plain)", price: 35, descAr: "فاتح / وسط / غامق / محروق", descEn: "Light, medium, dark or burnt roast" },
      { code: "turkish-mahawag", ar: "قهوة تركي محوج", en: "Spiced Turkish Coffee", price: 45, descAr: "حبهان خفيف أو دبل / مستكة / قرنفل / جوزة الطيب", descEn: "Light or double cardamom, mastic, cloves or nutmeg" },
      { code: "turkish-hazelnut", ar: "قهوة تركي بالبندق", en: "Hazelnut Turkish Coffee", price: 50, descAr: "بودرة بندق محمصة", descEn: "Roasted hazelnut powder" },
      { code: "turkish-chocolate", ar: "قهوة تركي بالشوكولاتة", en: "Chocolate Turkish Coffee", price: 50 },
      { code: "turkish-caramel", ar: "قهوة تركي بالكراميل", en: "Caramel Turkish Coffee", price: 50 },
      { code: "french-coffee", ar: "قهوة فرنساوي", en: "Café au Lait", price: 55, descAr: "بن تركي بحليب كامل الدسم", descEn: "Turkish roast brewed with full-fat milk" },
      { code: "french-nutella", ar: "قهوة فرنساوي نوتيلا", en: "Nutella Café au Lait", price: 65 },
      { code: "french-caramel", ar: "قهوة فرنساوي كراميل", en: "Caramel Café au Lait", price: 65 },
      { code: "arabic-coffee", ar: "قهوة عربي خليجي", en: "Arabic (Gulf) Coffee", price: 60, descAr: "حبهان وزعفران ومسمار — تُقدم مع تمر", descEn: "Cardamom, saffron & cloves — served with dates" },
      { code: "ottoman-coffee", ar: "قهوة عثمانلي", en: "Ottoman Coffee", price: 45, descAr: "رغوة كثيفة مع ماء ورد أو مستكة", descEn: "Dense foam with rose water or mastic" },
      { code: "saghidi-coffee", ar: "قهوة مغلية / صعيدي", en: "Slow-Brewed Saghidi Coffee", price: 40, descAr: "تغلي على نار هادئة لفترة طويلة", descEn: "Slow-brewed on low heat until thick" },
      { code: "koshary-tea", ar: "شاي كشري", en: "Egyptian Koshary Tea", price: 25, descAr: "خفيف / مظبوط / تقيل / ميزان", descEn: "Light, medium, strong or balanced" },
      { code: "mezza-tea", ar: "شاي ميزة / بلبن", en: "Milk Tea (Mezza)", price: 35, descAr: "حليب مغلي مع شاي", descEn: "Brewed tea with hot milk" },
      { code: "charcoal-tea", ar: "شاي براد", en: "Charcoal-Brewed Tea Pot", price: 35, descAr: "شاي مغلي على الفحم / النار", descEn: "Tea slow-brewed over charcoal flame" },
      { code: "green-tea", ar: "شاي أخضر", en: "Green Tea", price: 30, descAr: "سادة / بالنعناع / بالليمون / بالياسمين", descEn: "Plain, mint, lemon or jasmine" },
      { code: "english-tea", ar: "شاي إنجليزي", en: "English Tea", price: 35, descAr: "إيرل جراي / إنجلش بريكفاست", descEn: "Earl Grey or English Breakfast" },
      { code: "karak-tea", ar: "شاي كرك", en: "Karak Tea", price: 45, descAr: "حليب مكثف، حبهان، قرفة، زعفران", descEn: "Condensed milk, cardamom, cinnamon & saffron" },
      { code: "flavored-tea", ar: "شاي بنكهات", en: "Flavored Tea", price: 35, descAr: "خوخ / توت أحمر / فواكه استوائية", descEn: "Peach, raspberry or tropical fruits" },
      { code: "mint-beldi", ar: "نعناع بلدي مغلي", en: "Fresh Mint Infusion", price: 30 },
      { code: "anise-pure", ar: "ينسون نقي", en: "Pure Anise", price: 30 },
      { code: "hibiscus-warm", ar: "كركديه مغلي دافئ", en: "Warm Hibiscus", price: 30 },
      { code: "fenugreek-plain", ar: "حلبة حصى سادة", en: "Plain Fenugreek", price: 30 },
      { code: "fenugreek-milk", ar: "حلبة حصى بحليب", en: "Fenugreek with Milk", price: 40 },
      { code: "fenugreek-nuts", ar: "حلبة حصى بالسمن والمكسرات", en: "Fenugreek with Ghee & Nuts", price: 55 },
      { code: "cinnamon-plain", ar: "قرفة سادة", en: "Plain Cinnamon", price: 30 },
      { code: "cinnamon-milk", ar: "قرفة بالحليب", en: "Cinnamon with Milk", price: 45 },
      { code: "cinnamon-ginger", ar: "قرفة بالزنجبيل", en: "Cinnamon with Ginger", price: 40 },
      { code: "ginger-lemon-honey", ar: "زنجبيل فريش بالليمون والعسل", en: "Fresh Ginger with Lemon & Honey", price: 45 },
      { code: "tilio", ar: "تيليو", en: "Tilio Herbal Tea", price: 30 },
      { code: "chamomile", ar: "بابونج (كاموميل)", en: "Chamomile", price: 30 },
      { code: "hot-lemon", ar: "ليمون مغلي دافئ", en: "Warm Lemon Infusion", price: 30 },
      { code: "lemon-mint-honey", ar: "ليمون مغلي بالنعناع والعسل", en: "Lemon with Mint & Honey", price: 40 },
      { code: "winter-herbs-mix", ar: "ميكس أعشاب شتوي", en: "Winter Herbs Mix", price: 40, descAr: "ينسون + نعناع + كراوية + تيليو", descEn: "Anise, mint, licorice root & tilio" },
      { code: "sahlab-sesame", ar: "سحلب سادة بالسمسم", en: "Classic Sahlab with Sesame", price: 45 },
      { code: "sahlab-mixed-nuts", ar: "سحلب بالمكسرات المشكلة", en: "Sahlab with Mixed Nuts", price: 60, descAr: "فول سوداني، جوز هند، زبيب", descEn: "Peanuts, coconut & raisins" },
      { code: "sahlab-premium-nuts", ar: "سحلب مكسرات فاخرة", en: "Premium Sahlab", price: 75, descAr: "فستق، لوز، كاجو، عين جمل", descEn: "Pistachio, almonds, cashew & walnuts" },
      { code: "sahlab-fresh-fruit", ar: "سحلب بالفواكه الفريش", en: "Sahlab with Fresh Fruit", price: 70, descAr: "قطع موز، فراولة، كيوي", descEn: "Banana, strawberry & kiwi pieces" },
      { code: "sahlab-nutella", ar: "سحلب بالنوتيلا", en: "Nutella Sahlab", price: 70 },
      { code: "sahlab-lotus", ar: "سحلب باللوتس", en: "Lotus Sahlab", price: 70 },
      { code: "hummus-sham", ar: "حمص الشام (حلبسة)", en: "Hummus el-Sham", price: 40, descAr: "مع الشطة والكمون والدقة والليمون", descEn: "With chili, cumin, hummus spice & lemon" },
      { code: "moghat", ar: "مغات بالسمن البلدي والسمسم والمكسرات", en: "Moghat with Ghee, Sesame & Nuts", price: 65 },
    ],
  },

  /* ═══ 2. ركن الإسبريسو والقهوة المتخصصة ═══ */
  {
    slug: "specialty-coffee",
    ar: "إسبريسو وقهوة مختصة",
    en: "Hot Specialty Coffee",
    icon: "sparkles",
    items: [
      { code: "espresso-single", ar: "إسبريسو سينجل", en: "Single Espresso", price: 35 },
      { code: "espresso-double", ar: "إسبريسو دبل", en: "Double Espresso", price: 45 },
      { code: "ristretto", ar: "إسبريسو ريستريتو", en: "Ristretto", price: 35 },
      { code: "lungo", ar: "إسبريسو لونجو", en: "Lungo", price: 35 },
      { code: "espresso-macchiato", ar: "إسبريسو ماكياتو", en: "Espresso Macchiato", price: 45, descAr: "شوت إسبريسو مع نقطة فوم حليب", descEn: "Espresso shot topped with a dot of milk foam" },
      { code: "doppio", ar: "دوبيو", en: "Doppio", price: 45 },
      { code: "americano", ar: "أمريكانو", en: "Americano", price: 50 },
      { code: "long-black", ar: "لونج بلاك", en: "Long Black", price: 50 },
      { code: "cortado", ar: "كورتادو", en: "Cortado", price: 65 },
      { code: "flat-white", ar: "فلات وايت", en: "Flat White", price: 65 },
      { code: "cappuccino", ar: "كابتشينو", en: "Cappuccino", price: 65, descAr: "كلاسيك / سينامون بودر / كاكاو", descEn: "Classic, cinnamon powder or cocoa" },
      { code: "caffe-latte", ar: "كافيه لاتيه", en: "Caffè Latte", price: 70 },
      { code: "spanish-latte-hot", ar: "سبانش لاتيه ساخن", en: "Hot Spanish Latte", price: 80, descAr: "مع الحليب المكثف المحلى", descEn: "With sweetened condensed milk" },
      { code: "vanilla-latte", ar: "فانيلا لاتيه", en: "Vanilla Latte", price: 80 },
      { code: "caramel-latte", ar: "كراميل لاتيه", en: "Caramel Latte", price: 80 },
      { code: "hazelnut-latte", ar: "بندق لاتيه", en: "Hazelnut Latte", price: 80 },
      { code: "toffee-nut-latte", ar: "توفي نت لاتيه", en: "Toffee Nut Latte", price: 80 },
      { code: "pistachio-latte-hot", ar: "بيستاشيو لاتيه ساخن", en: "Hot Pistachio Latte", price: 95 },
      { code: "hot-mocha", ar: "كافيه موكا ساخنة", en: "Hot Caffè Mocha", price: 80, descAr: "شوكولاتة داكنة، إسبريسو، حليب مبخر", descEn: "Dark chocolate, espresso & steamed milk" },
      { code: "white-mocha-hot", ar: "وايت موكا ساخنة", en: "Hot White Mocha", price: 80 },
      { code: "hot-chocolate-classic", ar: "هوت شوكليت كلاسيك", en: "Classic Hot Chocolate", price: 65 },
      { code: "hot-chocolate-marshmallow", ar: "هوت شوكليت مارشميلو", en: "Marshmallow Hot Chocolate", price: 75 },
      { code: "hot-chocolate-nutella", ar: "هوت شوكليت نوتيلا", en: "Nutella Hot Chocolate", price: 75 },
      { code: "hot-chocolate-oreo", ar: "هوت شوكليت أوريو", en: "Oreo Hot Chocolate", price: 75 },
    ],
  },

  /* ═══ 3. القهوة الباردة والآيس كوفي ═══ */
  {
    slug: "iced-coffee",
    ar: "قهوة باردة وفرابيه",
    en: "Iced Coffee & Frappes",
    icon: "snow",
    items: [
      { code: "iced-americano", ar: "آيس أمريكانو", en: "Iced Americano", price: 55 },
      { code: "iced-latte", ar: "آيس لاتيه كلاسيك", en: "Iced Latte", price: 70 },
      { code: "iced-spanish-latte", ar: "آيس سبانش لاتيه", en: "Iced Spanish Latte", price: 85 },
      { code: "iced-pistachio-latte", ar: "آيس بيستاشيو لاتيه", en: "Iced Pistachio Latte", price: 95 },
      { code: "iced-caramel-macchiato", ar: "آيس كراميل ماكياتو", en: "Iced Caramel Macchiato", price: 85 },
      { code: "iced-white-mocha", ar: "آيس وايت موكا", en: "Iced White Mocha", price: 85 },
      { code: "iced-mocha", ar: "آيس كافيه موكا", en: "Iced Caffè Mocha", price: 85 },
      { code: "cold-brew", ar: "كولد برو كلاسيك", en: "Cold Brew", price: 70, descAr: "قهوة مقطرة باردة", descEn: "Slow-dripped cold coffee" },
      { code: "salted-caramel-cold-brew", ar: "كولد برو بالكراميل المملح", en: "Salted Caramel Cold Brew", price: 80 },
      { code: "shakerato", ar: "شيكراتو", en: "Shakerato", price: 50, descAr: "إسبريسو مخفوق بالثلج ورغوة كثيفة", descEn: "Espresso shaken over ice with dense foam" },
      { code: "espresso-frappe", ar: "فرابيه إسبريسو سادة", en: "Espresso Frappe", price: 80 },
      { code: "mocha-frappe", ar: "موكا فرابيه", en: "Mocha Frappe", price: 85 },
      { code: "caramel-frappe", ar: "كراميل فرابيه", en: "Caramel Frappe", price: 85 },
      { code: "vanilla-frappe", ar: "فانيلا فرابيه", en: "Vanilla Frappe", price: 85 },
      { code: "oreo-frappe", ar: "أوريو فرابيه", en: "Oreo Frappe", price: 90 },
      { code: "lotus-frappe", ar: "لوتس فرابيه", en: "Lotus Frappe", price: 90 },
      { code: "choco-chip-frappe", ar: "شوكليت شيب فرابيه", en: "Chocolate Chip Frappe", price: 90 },
    ],
  },

  /* ═══ 4. العصائر الطبيعية والفرش ═══ */
  {
    slug: "fresh-juices",
    ar: "عصائر فرش طبيعية",
    en: "Fresh Juices",
    icon: "citrus",
    items: [
      { code: "sugarcane", ar: "عصير قصب", en: "Fresh Sugarcane", variants: [V("سادة", "Plain", 25), V("بالبرتقال", "With Orange", 30), V("بالليمون", "With Lemon", 30)] },
      { code: "orange-fresh", ar: "برتقال فريش", en: "Fresh Orange", price: 50, descAr: "عادي / سكري / صيفي", descEn: "Regular, sweet or summer variety" },
      { code: "lemon-fresh", ar: "ليمون فريش", en: "Fresh Lemon", price: 40 },
      { code: "lemon-mint", ar: "ليمون بالنعناع فريش", en: "Lemon Mint", price: 50 },
      { code: "lemon-milk", ar: "ليمون بالحليب", en: "Lemon with Milk", price: 50 },
      { code: "mango-natural", ar: "مانجو طبيعي", en: "Natural Mango", price: 65, descAr: "عويس / زبدية / تيمور", descEn: "Aweis, Zabdia or Timor variety" },
      { code: "strawberry-natural", ar: "فراولة طبيعي", en: "Natural Strawberry", price: 55 },
      { code: "guava-natural", ar: "جوافة طبيعي", en: "Natural Guava", price: 55, descAr: "سادة / بالحليب / بالنعناع", descEn: "Plain, with milk or with mint" },
      { code: "banana-milk", ar: "موز بالحليب", en: "Banana with Milk", price: 55 },
      { code: "kiwi-fresh", ar: "كيوي فريش", en: "Fresh Kiwi", price: 65 },
      { code: "pomegranate-fresh", ar: "رمان فريش", en: "Fresh Pomegranate", price: 60, descAr: "حبوب / معصور", descEn: "Seeds or freshly pressed" },
      { code: "watermelon-fresh", ar: "بطيخ فريش", en: "Fresh Watermelon", price: 55, descAr: "في موسمه", descEn: "Seasonal" },
      { code: "pineapple-fresh", ar: "أناناس فريش", en: "Fresh Pineapple", price: 75 },
      { code: "apple-fresh", ar: "تفاح فريش", en: "Fresh Apple", price: 60, descAr: "أخضر / أحمر", descEn: "Green or red" },
      { code: "carrot-fresh", ar: "جزر فريش", en: "Fresh Carrot", variants: [V("سادة", "Plain", 45), V("برتقال وجزر", "Orange & Carrot", 55)] },
      { code: "avocado-plain", ar: "أفوكادو سادة", en: "Plain Avocado", price: 75 },
      { code: "avocado-honey-nuts", ar: "أفوكادو عسل ومكسرات", en: "Avocado with Honey & Nuts", price: 90 },
      { code: "avocado-greens-cream", ar: "أفوكادو بالجرجير والقشطة", en: "Avocado with Rocket & Cream", price: 95 },
      { code: "dom-fresh", ar: "دوم فريش", en: "Fresh Dom (Hyphaene)", price: 50, descAr: "بارد مثلج", descEn: "Served chilled" },
      { code: "kharroub-fresh", ar: "خروب فريش", en: "Fresh Carob", price: 50 },
      { code: "licorice-iced", ar: "عرقسوس مثلج", en: "Iced Licorice (Erk Sous)", price: 40 },
      { code: "tamarind-beldi", ar: "تمر هندي بلدي", en: "Tamarind Drink", price: 50 },
      { code: "hibiscus-cold", ar: "كركديه ساقع", en: "Chilled Hibiscus", price: 45, descAr: "عناب أسواني", descEn: "Aswan winter hibiscus" },
      { code: "sobia", ar: "سوبيا طبيعي", en: "Natural Sobia", variants: [V("سادة", "Plain", 50), V("بالمكسرات", "With Nuts", 65), V("بالفواكه", "With Fruits", 65)] },
    ],
  },

  /* ═══ 5. الكوكتيلات والخلطات المصرية ═══ */
  {
    slug: "egyptian-cocktails",
    ar: "كوكتيلات وخلطات مصرية",
    en: "Egyptian Cocktails",
    icon: "martini",
    items: [
      { code: "cocktail-fakhfekhina", ar: "كوكتيل فخفخينا", en: "Fakhfekhina Cocktail", price: 75, descAr: "طبقات مانجو وفراولة وجوافة وقطع فواكه مع بولة آيس كريم ومكسرات", descEn: "Mango, strawberry & guava layers with fruit pieces, ice cream scoop and nuts" },
      { code: "cocktail-falantino", ar: "كوكتيل فلانتينو", en: "Falantino Cocktail", price: 70, descAr: "مانجو، فراولة، موز، آيس كريم فانيلا", descEn: "Mango, strawberry, banana & vanilla ice cream" },
      { code: "cocktail-sunshine", ar: "كوكتيل صن شاين", en: "Sunshine Cocktail", price: 55, descAr: "سفن أب، شراب رمان، ليمون، شريحة برتقال", descEn: "7UP, pomegranate syrup, lemon & orange slice" },
      { code: "cocktail-hawaii", ar: "كوكتيل هاواي", en: "Hawaii Cocktail", price: 70, descAr: "أناناس، جوز هند، موز، حليب", descEn: "Pineapple, coconut, banana & milk" },
      { code: "cocktail-albano", ar: "كوكتيل ألبانو", en: "Albano Cocktail", price: 70, descAr: "موز، فراولة، حليب، عسل نحل", descEn: "Banana, strawberry, milk & bee honey" },
      { code: "cocktail-rocket", ar: "كوكتيل روكيت / فياجرا", en: "Rocket / Viagra Cocktail", price: 95, descAr: "أفوكادو، كيوي، جرجير، عسل، مكسرات، قشطة، حبة البركة", descEn: "Avocado, kiwi, rocket, honey, nuts, cream & black seed" },
      { code: "cocktail-bubbles", ar: "كوكتيل بابلز", en: "Bubbles Cocktail", price: 70, descAr: "ميكس فواكه استوائية وقطع تفاح وخوخ", descEn: "Tropical fruit mix with apple & peach pieces" },
      { code: "cocktail-awar-alb", ar: "كوكتيل عوار قلب", en: "Awar Elb Cocktail", price: 70, descAr: "مانجو، فراولة، آيس كريم فانيليا", descEn: "Mango, strawberry & vanilla ice cream" },
      { code: "fruit-salad-classic", ar: "سلطة فواكه كلاسيك", en: "Classic Fruit Salad", price: 65, descAr: "صحن قطع فواكه مشكلة مع عصير مانجو وعسل", descEn: "Mixed fruit plate with mango juice & honey" },
      { code: "fruit-salad-super", ar: "سلطة فواكه سوبر", en: "Super Fruit Salad", price: 85, descAr: "فواكه مشكلة + قشطة + بولة آيس كريم + مكسرات وصوص لوتس/نوتيلا", descEn: "Mixed fruits, cream, ice cream scoop, nuts & lotus/nutella sauce" },
    ],
  },

  /* ═══ 6. السموذي والميلك شيك والموهيتو ═══ */
  {
    slug: "smoothies-shakes",
    ar: "سموذي وميلك شيك وموهيتو",
    en: "Smoothies, Shakes & Mojitos",
    icon: "ice-cream",
    items: [
      { code: "smoothie-mango", ar: "سموذي مانجو", en: "Mango Smoothie", price: 70 },
      { code: "smoothie-strawberry", ar: "سموذي فراولة", en: "Strawberry Smoothie", price: 70 },
      { code: "smoothie-peach", ar: "سموذي خوخ", en: "Peach Smoothie", price: 70 },
      { code: "smoothie-blueberry", ar: "سموذي توت أزرق", en: "Blueberry Smoothie", price: 75 },
      { code: "smoothie-mix-berry", ar: "سموذي ميكس بيري", en: "Mix Berry Smoothie", price: 75 },
      { code: "smoothie-passion", ar: "سموذي باشن فروت", en: "Passion Fruit Smoothie", price: 75 },
      { code: "smoothie-pineapple-colada", ar: "سموذي أناناس وكولادا", en: "Pineapple Colada Smoothie", price: 75 },
      { code: "smoothie-kiwi-lemon", ar: "سموذي كيوي وليمون", en: "Kiwi & Lemon Smoothie", price: 70 },
      { code: "shake-vanilla", ar: "ميلك شيك فانيليا", en: "Vanilla Milkshake", price: 70 },
      { code: "shake-chocolate", ar: "ميلك شيك شوكولاتة", en: "Chocolate Milkshake", price: 70 },
      { code: "shake-strawberry", ar: "ميلك شيك فراولة", en: "Strawberry Milkshake", price: 70 },
      { code: "shake-mango", ar: "ميلك شيك مانجو", en: "Mango Milkshake", price: 70 },
      { code: "shake-oreo", ar: "ميلك شيك أوريو كلاسيك", en: "Classic Oreo Milkshake", price: 80 },
      { code: "shake-lotus", ar: "ميلك شيك لوتس بيسكوف", en: "Lotus Biscoff Milkshake", price: 85 },
      { code: "shake-nutella", ar: "ميلك شيك نوتيلا", en: "Nutella Milkshake", price: 85 },
      { code: "shake-kitkat", ar: "ميلك شيك كيت كات", en: "KitKat Milkshake", price: 85 },
      { code: "shake-snickers", ar: "ميلك شيك سنيكرز", en: "Snickers Milkshake", price: 85, descAr: "مع كراميل وسوداني", descEn: "With caramel & peanuts" },
      { code: "shake-kinder-bueno", ar: "ميلك شيك كيندر بوينو", en: "Kinder Bueno Milkshake", price: 85 },
      { code: "shake-brownie", ar: "ميلك شيك براونيز", en: "Brownie Milkshake", price: 85 },
      { code: "shake-berry-cheesecake", ar: "ميلك شيك تشيز كيك توت", en: "Berry Cheesecake Milkshake", price: 90 },
      { code: "shake-pistachio", ar: "ميلك شيك بيستاشيو", en: "Pistachio Milkshake", price: 95, descAr: "فستق حلبي", descEn: "Aleppo pistachio" },
      { code: "mojito-classic", ar: "موهيتو كلاسيك", en: "Classic Mojito", price: 55, descAr: "سفن أب، ليمون، نعناع، سيرب سكر، ثلج مجروش", descEn: "7UP, lemon, mint, sugar syrup & crushed ice" },
      { code: "mojito-blue-ocean", ar: "موهيتو بلو باشن", en: "Blue Ocean Mojito", price: 65, descAr: "بلو كوراساو", descEn: "Blue Curaçao" },
      { code: "mojito-strawberry", ar: "موهيتو فراولة", en: "Strawberry Mojito", price: 65 },
      { code: "mojito-blueberry", ar: "موهيتو توت أزرق", en: "Blueberry Mojito", price: 65 },
      { code: "mojito-mix-berry", ar: "موهيتو ميكس بيري", en: "Mix Berry Mojito", price: 65 },
      { code: "mojito-passion", ar: "موهيتو باشن فروت", en: "Passion Fruit Mojito", price: 65 },
      { code: "mojito-watermelon", ar: "موهيتو بطيخ", en: "Watermelon Mojito", price: 65 },
      { code: "mojito-green-apple", ar: "موهيتو تفاح أخضر", en: "Green Apple Mojito", price: 65 },
      { code: "mojito-pomegranate", ar: "موهيتو رمان", en: "Pomegranate Mojito", price: 65 },
      { code: "mojito-energy", ar: "موهيتو طاقة", en: "Energy Mojito", price: 90, descAr: "ريد بول بنكهات", descEn: "Red Bull with flavors" },
      { code: "energy-mix", ar: "ميكس طاقة كود رد / ريدبول", en: "Energy Mix (Code Red / Red Bull)", price: 90, descAr: "مع بيري، ليمون نعناع، أو خوخ", descEn: "With berry, lemon-mint or peach" },
      { code: "soda-can", ar: "مشروبات غازية كانز", en: "Canned Soft Drinks", price: 30, descAr: "بيبسي، دايت، سفن أب، ميرندا، شويبس", descEn: "Pepsi, Diet, 7UP, Mirinda, Schweppes" },
      { code: "mineral-water", ar: "مياه معدنية", en: "Mineral Water", variants: [V("صغيرة", "Small", 15), V("كبيرة", "Large", 25)] },
      { code: "sparkling-water", ar: "مياه فوارة (سودا / بريه)", en: "Sparkling Water (Soda / Bireh)", price: 30 },
    ],
  },

  /* ═══ 7. الحلويات الغربية والشرقية والمخبوزات ═══ */
  {
    slug: "desserts",
    ar: "حلويات ومخبوزات",
    en: "Desserts & Bakery",
    icon: "cake",
    items: [
      { code: "waffle-nutella", ar: "وافل نوتيلا كلاسيك", en: "Classic Nutella Waffle", price: 80 },
      { code: "waffle-white-choc", ar: "وافل وايت شوكليت", en: "White Chocolate Waffle", price: 80 },
      { code: "waffle-lotus", ar: "وافل لوتس مقرمش", en: "Crunchy Lotus Waffle", price: 90 },
      { code: "waffle-pistachio", ar: "وافل بيستاشيو", en: "Pistachio Waffle", price: 110, descAr: "زبدة فستق", descEn: "Pistachio butter" },
      { code: "waffle-kinder-bueno", ar: "وافل كيندر بوينو", en: "Kinder Bueno Waffle", price: 95 },
      { code: "waffle-mix-choco", ar: "وافل ميكس شوكولاتة", en: "Mixed Chocolate Waffle", price: 90, descAr: "نصف نوتيلا / نصف لوتس أو وايت", descEn: "Half nutella, half lotus or white chocolate" },
      { code: "waffle-mixed-fruit", ar: "وافل فواكه مشكلة", en: "Mixed Fruit Waffle", price: 90, descAr: "مع صوص شوكولاتة أو كراميل", descEn: "With chocolate or caramel sauce" },
      { code: "waffle-four-seasons", ar: "وافل فور سيزونز", en: "Four Seasons Waffle", price: 110, descAr: "4 أرباع: نوتيلا، لوتس، وايت، بيستاشيو", descEn: "4 quarters: nutella, lotus, white & pistachio" },
      { code: "pancake-classic", ar: "بان كيك كلاسيك", en: "Classic Pancakes", price: 65, descAr: "مع عسل نحل أو زبدة وميبل سيرب", descEn: "With honey or butter & maple syrup" },
      { code: "pancake-nutella-banana", ar: "بان كيك نوتيلا وموز", en: "Nutella & Banana Pancakes", price: 80 },
      { code: "pancake-lotus-berry", ar: "بان كيك لوتس وتوت", en: "Lotus & Berry Pancakes", price: 85 },
      { code: "mini-pancakes", ar: "ميني بان كيك", en: "Mini Pancakes", variants: [V("10 قطع", "10 pieces", 65), V("15 قطعة", "15 pieces", 85)], descAr: "بجميع خيارات الصوصات والإضافات", descEn: "With all sauce & topping options" },
      { code: "crepe-nutella", ar: "كريب نوتيلا سادة", en: "Plain Nutella Crepe", price: 75 },
      { code: "crepe-nutella-banana-nuts", ar: "كريب نوتيلا بالموز والمكسرات", en: "Nutella Crepe with Banana & Nuts", price: 85 },
      { code: "crepe-lotus-crunchy", ar: "كريب لوتس كرانشي", en: "Crunchy Lotus Crepe", price: 85 },
      { code: "crepe-mixed-fruit", ar: "كريب فواكه مشكلة", en: "Mixed Fruit Crepe", price: 85 },
      { code: "crepe-mix-choco", ar: "كريب ميكس شوكولاتة", en: "Mixed Chocolate Crepe", price: 95, descAr: "نوتيلا ووايت شوكليت وبراونيز", descEn: "Nutella, white chocolate & brownie" },
      { code: "fettuccine-crepe", ar: "فيتوتشيني كريب", en: "Fettuccine Crepe", price: 100, descAr: "شرائح كريب مع صوصات مشكلة وبولة آيس كريم", descEn: "Crepe ribbons with mixed sauces & ice cream scoop" },
      { code: "ny-cheesecake", ar: "تشيز كيك كلاسيك نيويورك", en: "Classic New York Cheesecake", price: 80 },
      { code: "cheesecake-blueberry", ar: "تشيز كيك بلوبيري", en: "Blueberry Cheesecake", price: 85 },
      { code: "cheesecake-raspberry", ar: "تشيز كيك راسبيري", en: "Raspberry Cheesecake", price: 85 },
      { code: "cheesecake-strawberry", ar: "تشيز كيك فراولة", en: "Strawberry Cheesecake", price: 85 },
      { code: "cheesecake-lotus", ar: "تشيز كيك لوتس", en: "Lotus Cheesecake", price: 85 },
      { code: "cheesecake-nutella", ar: "تشيز كيك نوتيلا", en: "Nutella Cheesecake", price: 85 },
      { code: "cheesecake-salted-caramel", ar: "تشيز كيك كراميل وساليتد كراميل", en: "Caramel & Salted Caramel Cheesecake", price: 85 },
      { code: "san-sebastian-cheesecake", ar: "سان سباستيان تشيز كيك", en: "San Sebastián Cheesecake", price: 100, descAr: "تقدم دافئة مع صوص شوكولاتة بلجيكي خام", descEn: "Served warm with raw Belgian chocolate sauce" },
      { code: "molten-cake-classic", ar: "مولتن كيك كلاسيك", en: "Classic Molten Lava Cake", price: 85, descAr: "شوكولاتة مذابة مع بولة آيس كريم فانيليا", descEn: "Molten chocolate with vanilla ice cream scoop" },
      { code: "molten-lotus", ar: "مولتن لوتس", en: "Lotus Molten Cake", price: 95 },
      { code: "molten-white-choc", ar: "مولتن وايت شوكليت", en: "White Chocolate Molten Cake", price: 95 },
      { code: "brownie-classic", ar: "براونيز كلاسيك", en: "Classic Brownie", price: 75, descAr: "دافئة مع آيس كريم فانيليا وصوص شوكولاتة", descEn: "Warm, with vanilla ice cream & chocolate sauce" },
      { code: "fudge-cake", ar: "فادج كيك شوكولاتة طبقات", en: "Layered Chocolate Fudge Cake", price: 75 },
      { code: "medovik-honey-cake", ar: "كيكة العسل الروسية", en: "Russian Honey Cake (Medovik)", price: 80 },
      { code: "carrot-cake", ar: "كيكة الجزر", en: "Carrot Cake", price: 75, descAr: "مع الكريمة والجوز", descEn: "With cream cheese & walnuts" },
      { code: "red-velvet-cake", ar: "ريد فيلفيت كيك", en: "Red Velvet Cake", price: 75 },
      { code: "tiramisu-italian", ar: "تيراميسو إيطالي أصلي", en: "Original Italian Tiramisu", price: 80 },
      { code: "cookies-choc-chips", ar: "كوكيز شوكليت شيبس كلاسيك", en: "Classic Choc-Chip Cookies", price: 35 },
      { code: "cookies-stuffed", ar: "كوكيز محشوة", en: "Stuffed Cookies", price: 45, descAr: "نوتيلا / لوتس / كيندر", descEn: "Nutella, lotus or kinder" },
      { code: "cinnamon-roll-classic", ar: "سينابون رول كلاسيك", en: "Classic Cinnamon Roll", price: 60, descAr: "مع الجليز الأبيض الأصلي", descEn: "With original white glaze" },
      { code: "cinnamon-choco-nutella", ar: "سينابون شوكولاتة ونوتيلا", en: "Chocolate & Nutella Cinnamon Roll", price: 70 },
      { code: "cinnamon-lotus-pecan", ar: "سينابون لوتس وبيكان", en: "Lotus & Pecan Cinnamon Roll", price: 75 },
      { code: "cinnamon-caramel-walnut", ar: "سينابون كراميل وعين جمل", en: "Caramel & Walnut Cinnamon Roll", price: 75 },
      { code: "tagn-nutella-marshmallow", ar: "طاجن نوتيلا مارشميلو بالفرن", en: "Baked Nutella & Marshmallow Tagine", price: 85 },
      { code: "tagn-elsadaa", ar: "طاجن السعادة", en: "Elsadaa (Happiness) Tagine", price: 90, descAr: "ميكس كيك، صوصات، نوتيلا، مالتيزرز، كيت كات", descEn: "Cake mix, sauces, nutella, maltesers & kitkat" },
      { code: "om-ali-classic", ar: "أم علي كلاسيك بالمكسرات", en: "Classic Om Ali with Nuts", price: 55, descAr: "حليب كامل الدسم، ميل فوي، قشطة", descEn: "Full-fat milk, puff pastry & cream" },
      { code: "om-ali-super", ar: "أم علي سوبر بالقشطة والمكسرات الفاخرة", en: "Super Om Ali with Premium Nuts", price: 70 },
      { code: "om-ali-nutella-lotus", ar: "أم علي بالنوتيلا واللوتس", en: "Om Ali with Nutella & Lotus", price: 75 },
      { code: "rice-pudding-plain", ar: "أرز بلبن سادة", en: "Plain Rice Pudding", price: 35 },
      { code: "rice-pudding-oven", ar: "أرز بلبن بالفرن", en: "Oven-Baked Rice Pudding", price: 40 },
      { code: "rice-pudding-nuts-cream", ar: "أرز بلبن بالمكسرات والقشطة", en: "Rice Pudding with Nuts & Cream", price: 55 },
      { code: "rice-pudding-fruit", ar: "أرز بلبن فواكه وبولة آيس كريم", en: "Rice Pudding with Fruit & Ice Cream", price: 60 },
      { code: "rice-pudding-lotus-nutella", ar: "أرز بلبن لوتس ونوتيلا", en: "Rice Pudding with Lotus & Nutella", price: 60 },
    ],
  },

  /* ═══ 8. الشيشة والمعسل ═══ */
  {
    slug: "shisha",
    ar: "شيشة ومعسل",
    en: "Shisha & Tobacco",
    icon: "shisha",
    items: [
      { code: "sh-gass-masry", ar: "معسل قص مصري أصلي", en: "Original Egyptian Gass Molasses", price: 40 },
      { code: "sh-saloom-classic", ar: "معسل سلوم كلاسيك", en: "Saloom Classic", price: 40 },
      { code: "sh-zaghloul-black", ar: "معسل زغلول أسود", en: "Zaghloul Black", price: 40 },
      { code: "sh-hamaky-batta", ar: "معسل حماقي / بطة", en: "Hamaky / Batta", price: 40 },
      { code: "sh-two-apples-nakhla", ar: "تفاحتين نخلة", en: "Two Apples (Nakhla)", price: 65 },
      { code: "sh-two-apples-premium", ar: "تفاحتين الفاخر", en: "Premium Two Apples", price: 65 },
      { code: "sh-two-apples-mint", ar: "تفاحتين مع نعناع", en: "Two Apples with Mint", price: 65 },
      { code: "sh-pure-mint", ar: "نعناع صافي", en: "Pure Mint", price: 65 },
      { code: "sh-lemon-mint", ar: "ليمون ونعناع", en: "Lemon & Mint", price: 65 },
      { code: "sh-classic-grape", ar: "عنب كلاسيك", en: "Classic Grape", price: 65 },
      { code: "sh-grape-mint", ar: "عنب ونعناع", en: "Grape & Mint", price: 65 },
      { code: "sh-black-grape", ar: "عنب أسود فاخر", en: "Premium Black Grape", price: 65 },
      { code: "sh-premium-peach", ar: "خوخ الفاخر", en: "Premium Peach", price: 65 },
      { code: "sh-watermelon", ar: "بطيخ", en: "Watermelon", price: 65 },
      { code: "sh-watermelon-mint", ar: "بطيخ ونعناع", en: "Watermelon & Mint", price: 65 },
      { code: "sh-pure-strawberry", ar: "فراولة صافي", en: "Pure Strawberry", price: 65 },
      { code: "sh-cantaloupe", ar: "كانتلوب / شمام", en: "Cantaloupe", price: 65 },
      { code: "sh-pure-orange", ar: "برتقال صافي", en: "Pure Orange", price: 65 },
      { code: "sh-orange-mint", ar: "برتقال ونعناع", en: "Orange & Mint", price: 65 },
      { code: "sh-cherry", ar: "كرز", en: "Cherry", price: 65 },
      { code: "sh-blueberry", ar: "بلوبيري (توت أزرق)", en: "Blueberry", price: 75 },
      { code: "sh-blueberry-mint", ar: "بلوبيري نعناع", en: "Blueberry & Mint", price: 75 },
      { code: "sh-blueberry-lemon", ar: "بلوبيري ليمون", en: "Blueberry & Lemon", price: 75 },
      { code: "sh-gum-mastic", ar: "علكة (مستكة / لبان)", en: "Gum (Mastic / Mastic Gum)", price: 75 },
      { code: "sh-gum-mint", ar: "علكة ونعناع", en: "Gum & Mint", price: 75 },
      { code: "sh-gum-cinnamon", ar: "علكة وقرفة", en: "Gum & Cinnamon", price: 75 },
      { code: "sh-gum-two-apples", ar: "علكة تفاحتين", en: "Gum Two Apples", price: 75 },
      { code: "sh-mango-tropical", ar: "مانجو وفواكه استوائية", en: "Mango & Tropical Fruits", price: 75 },
      { code: "sh-passion-fruit", ar: "باشن فروت", en: "Passion Fruit", price: 75 },
      { code: "sh-guava-mint", ar: "جوافة ونعناع", en: "Guava & Mint", price: 75 },
      { code: "sh-kiwi-lemon-mint", ar: "كيوي وليمون نعناع", en: "Kiwi, Lemon & Mint", price: 75 },
      { code: "sh-love-66", ar: "ميكس لوف 66", en: "Love 66 Mix", price: 80, descAr: "توت وبطيخ ونعناع مع لمسة مثلجة", descEn: "Berry, watermelon & mint with an icy touch" },
      { code: "sh-lady-killer", ar: "ميكس مياو (Lady Killer)", en: "Lady Killer Mix", price: 80, descAr: "خوخ، مانجو، نعناع وميكس بيري", descEn: "Peach, mango, mint & mixed berries" },
      { code: "sh-hawagheb", ar: "ميكس حواجب", en: "Hawagheb Mix", price: 80, descAr: "ميكس فواكه وتوت شهير في مصر", descEn: "Egypt's famous fruit & berry mix" },
      { code: "sh-energy-mix", ar: "كود رد / مشروب طاقة ميكس", en: "Code Red / Energy Drink Mix", price: 85 },
      { code: "sh-cappuccino-choco", ar: "كابتشينو وشوكولاتة", en: "Cappuccino & Chocolate", price: 80 },
      { code: "sh-fruit-head", ar: "حجر فواكه طبيعي", en: "Natural Fruit Head", price: 110, descAr: "رأس شيشة من تفاحة أو برتقالة أو أناناس مفرغ", descEn: "Hollowed apple, orange or pineapple bowl" },
    ],
  },
];

/* ─────────────────── section 9 → add-on groups ─────────────────── */

const ADDON_GROUPS: {
  code: string;
  ar: string;
  en: string;
  min: number;
  max: number;
  addons: { ar: string; en: string; delta: number }[];
  linkCategorySlugs: string[];
}[] = [
  {
    code: "drink-extras",
    ar: "إضافات المشروبات",
    en: "Drink Add-ons",
    min: 0,
    max: 0,
    addons: [
      { ar: "شوت إسبريسو إضافي", en: "Extra Espresso Shot", delta: 20 },
      { ar: "تغيير الحليب (لوز / جوز هند / صويا / خالي الدسم / لاكتوز)", en: "Milk swap (almond / coconut / soy / skim / lactose-free)", delta: 25 },
      { ar: "نكهات وسيرب (كراميل / فانيليا / بندق / قرفة / ملح إنجليزي / كوكيز)", en: "Syrup flavors (caramel / vanilla / hazelnut / cinnamon / salted / cookies)", delta: 15 },
      { ar: "ويبد كريم", en: "Whipped Cream", delta: 15 },
      { ar: "عسل نحل بديل للسكر", en: "Honey instead of sugar", delta: 10 },
      { ar: "حليب مبخر إضافي", en: "Extra steamed milk", delta: 15 },
    ],
    linkCategorySlugs: ["hot-drinks", "specialty-coffee", "iced-coffee", "smoothies-shakes"],
  },
  {
    code: "dessert-extras",
    ar: "إضافات الحلويات",
    en: "Dessert Add-ons",
    min: 0,
    max: 0,
    addons: [
      { ar: "بولة آيس كريم (فانيليا / شوكولاتة / فراولة / مستكة)", en: "Ice cream scoop (vanilla / chocolate / strawberry / mastic)", delta: 25 },
      { ar: "مكسرات محمصة مشكلة", en: "Roasted mixed nuts", delta: 25 },
      { ar: "كاجو / فستق حلبي مدقوق", en: "Crushed cashew / pistachio", delta: 30 },
      { ar: "صوص إضافي (نوتيلا / لوتس / بيستاشيو / كيندر / وايت / كراميل)", en: "Extra sauce (nutella / lotus / pistachio / kinder / white / caramel)", delta: 25 },
      { ar: "قطع فواكه طازجة إضافية (موز / فراولة / كيوي)", en: "Extra fresh fruit pieces (banana / strawberry / kiwi)", delta: 20 },
    ],
    linkCategorySlugs: ["desserts"],
  },
  {
    code: "shisha-extras",
    ar: "إضافات الشيشة",
    en: "Shisha Add-ons",
    min: 0,
    max: 0,
    addons: [
      { ar: "خرطوم طبي معقم", en: "Disposable hose", delta: 15 },
      { ar: "آيس بازوكا (خرطوم فريزر مثلج)", en: "Ice Bazooka (frozen hose)", delta: 20 },
      { ar: "إضافة ثلج للقاعدة الزجاجية", en: "Ice for the glass base", delta: 10 },
      { ar: "تبديل ماء الشيشة بحليب أو عصير", en: "Milk or juice instead of water", delta: 25 },
      { ar: "حجر إضافي / تغيير حجر (يُحسب في الكاشير)", en: "Extra coal / coal change (charged at register)", delta: 0 },
    ],
    linkCategorySlugs: ["shisha"],
  },
];

/* ─────────────────────────── build workbook ─────────────────────────── */

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C1917" } };

function styleHeader(ws: ExcelJS.Worksheet): void {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  header.fill = HEADER_FILL;
  header.alignment = { horizontal: "center", vertical: "middle" };
  header.height = 22;
  ws.columns.forEach((c) => (c.width = Math.max(14, String(c.header ?? "").length + 4)));
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function addSheet(wb: ExcelJS.Workbook, name: string, headers: string[], rows: (string | number | null)[][]): void {
  const ws = wb.addWorksheet(name);
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r);
  styleHeader(ws);
}

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Elsa3d Cafe — real catalog";

  /* README */
  const readme = wb.addWorksheet("README", { views: [{ rightToLeft: true }] });
  readme.columns = [{ width: 100 }];
  readme.addRow(["الكتالوج الحقيقي لكافيه السعد — 8 أقسام بنفس تقسيم ملفات المصدر + مجموعات إضافات مرتبطة بالأصناف."]);
  readme.addRow(["الأسعار بالجنيه المصري حسب ملف menuwithpricelist.txt — التعديل من لوحة التحكم أو بتعديل الملف وإعادة استيراد (دمج)."]);

  const catRows: (string | number | null)[][] = [];
  const itemRows: (string | number | null)[][] = [];
  const variantRows: (string | number | null)[][] = [];
  const linkRows: (string | number | null)[][] = [];

  CATEGORIES.forEach((cat, ci) => {
    catRows.push([cat.slug, cat.ar, cat.en, cat.icon, ci + 1, 1, "classic_list", null, null]);
    cat.items.forEach((it, ii) => {
      itemRows.push([it.code, cat.slug, it.ar, it.en, it.descAr ?? null, it.descEn ?? null, "", null, ii + 1, 1]);
      if (it.variants) {
        it.variants.forEach((v, vi) => variantRows.push([it.code, v.ar, v.en, v.price, vi + 1, 1, 1]));
      } else if (it.price !== undefined) {
        variantRows.push([it.code, null, null, it.price, 1, 1, 1]);
      }
    });
  });

  for (const g of ADDON_GROUPS) {
    for (const cat of CATEGORIES) {
      if (g.linkCategorySlugs.includes(cat.slug)) {
        for (const it of cat.items) linkRows.push([it.code, g.code]);
      }
    }
  }

  const groupRows = ADDON_GROUPS.map((g, i) => [g.code, g.ar, g.en, g.min, g.max, i + 1, 1]);
  const addonRows = ADDON_GROUPS.flatMap((g) => g.addons.map((a, i) => [g.code, a.ar, a.en, a.delta, i + 1, 1, 1]));

  addSheet(wb, "Categories", CATEGORY_HEADERS, catRows);
  addSheet(wb, "Items", ITEM_HEADERS, itemRows);
  addSheet(wb, "Variants", VARIANT_HEADERS, variantRows);
  addSheet(wb, "AddonGroups", GROUP_HEADERS, groupRows);
  addSheet(wb, "Addons", ADDON_HEADERS, addonRows);
  addSheet(wb, "ItemAddonLinks", LINK_HEADERS, linkRows);

  const out = path.join(process.cwd(), "menusources_and_price", "elsa3d-cafe-menu-catalog.xlsx");
  fs.writeFileSync(out, Buffer.from(await wb.xlsx.writeBuffer()));
  const itemCount = itemRows.length;
  const variantCount = variantRows.length;
  console.log(`✓ ${out}`);
  console.log(`  categories: ${catRows.length} · items: ${itemCount} · variants: ${variantCount} · links: ${linkRows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
