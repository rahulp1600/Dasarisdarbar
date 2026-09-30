// ============================================================================
// DASARI'S DARBAR - LOCAL DATA STORE MANAGER (OFFLINE / EXPERIMENTAL MODE)
// 100% Local in-browser persistence (localStorage) with zero Supabase dependencies.
import loyaltyEngine from './loyaltyEngine';

const INITIAL_MENU = [
  // 1. SOUPS - VEG
  { id: 's_v1', category: 'soups', name: 'Veg Corn Soup', description: 'Sweet corn kernel broth soft seasoned.', price: 110, tag: null, is_veg: true, is_available: true },
  { id: 's_v2', category: 'soups', name: 'Veg Manchow Soup', description: 'Spicy Indo-Chinese dark broth with fried noodles.', price: 110, tag: null, is_veg: true, is_available: true },
  { id: 's_v3', category: 'soups', name: 'Veg Clear Soup', description: 'Light herbal vegetable broth.', price: 110, tag: null, is_veg: true, is_available: true },
  { id: 's_v4', category: 'soups', name: 'Veg Hot & Sour Soup', description: 'Fiery and tangy vegetable soup.', price: 110, tag: null, is_veg: true, is_available: true },
  { id: 's_v5', category: 'soups', name: 'Veg Garlic Soup', description: 'Infused garlic vegetable broth.', price: 110, tag: null, is_veg: true, is_available: true },
  { id: 's_v6', category: 'soups', name: 'Tomato Soup', description: 'Creamy spiced tomato soup.', price: 110, tag: null, is_veg: true, is_available: true },

  // 1. SOUPS - NON VEG
  { id: 's_nv1', category: 'soups', name: 'Chicken Corn Soup', description: 'Rich chicken broth with sweet corn.', price: 140, tag: 'popular', is_veg: false, is_available: true },
  { id: 's_nv2', category: 'soups', name: 'Chicken Hot & Sour Soup', description: 'Tangy spicy chicken soup.', price: 140, tag: null, is_veg: false, is_available: true },
  { id: 's_nv3', category: 'soups', name: 'Chicken Manchow Soup', description: 'Classic spicy chicken Manchow with crispy noodles.', price: 140, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 's_nv4', category: 'soups', name: 'Chicken Garlic Soup', description: 'Garlic infused aromatic chicken soup.', price: 140, tag: null, is_veg: false, is_available: true },
  { id: 's_nv5', category: 'soups', name: 'Chicken Clear Soup', description: 'Healthy clear chicken soup.', price: 140, tag: null, is_veg: false, is_available: true },

  // 2. STARTERS - VEG STARTERS
  { id: 'st_v1', category: 'starters', name: 'Veg Manchuria', description: 'Crispy fried veg dumplings tossed in Manchurian sauce.', price: 160, tag: null, is_veg: true, is_available: true },
  { id: 'st_v2', category: 'starters', name: 'Chilli Veg', description: 'Assorted veggies tossed in spicy chilli garlic sauce.', price: 160, tag: null, is_veg: true, is_available: true },
  { id: 'st_v3', category: 'starters', name: 'Veg 65', description: 'Deep fried crispy vegetables with 65 spices.', price: 160, tag: null, is_veg: true, is_available: true },
  { id: 'st_v4', category: 'starters', name: 'Paneer Manchuria', description: 'Cottage cheese cubes tossed in savory Manchurian sauce.', price: 230, tag: null, is_veg: true, is_available: true },
  { id: 'st_v5', category: 'starters', name: 'Chilli Paneer', description: 'Indo-Chinese spicy chilli cottage cheese.', price: 230, tag: 'popular', is_veg: true, is_available: true },
  { id: 'st_v6', category: 'starters', name: 'Paneer 65', description: 'Paneer cubes fried with Andhra 65 spice mix.', price: 230, tag: null, is_veg: true, is_available: true },
  { id: 'st_v7', category: 'starters', name: 'Paneer Majestic', description: 'Cottage cheese strips tossed with green chillies & curd.', price: 250, tag: 'must_try', is_veg: true, is_available: true },
  { id: 'st_v8', category: 'starters', name: 'Chilli Garlic Paneer', description: 'Paneer cubes tossed with roasted garlic & chillies.', price: 250, tag: null, is_veg: true, is_available: true },
  { id: 'st_v9', category: 'starters', name: 'Babycorn Manchuria', description: 'Crispy babycorn in Manchurian gravy.', price: 230, tag: null, is_veg: true, is_available: true },
  { id: 'st_v10', category: 'starters', name: 'Babycorn 65', description: 'Crispy babycorn in southern 65 spices.', price: 230, tag: null, is_veg: true, is_available: true },
  { id: 'st_v11', category: 'starters', name: 'Chilli Babycorn', description: 'Wok fried chilli garlic babycorn.', price: 230, tag: null, is_veg: true, is_available: true },
  { id: 'st_v12', category: 'starters', name: 'Mushroom Manchuria', description: 'Button mushrooms in Manchurian sauce.', price: 250, tag: null, is_veg: true, is_available: true },
  { id: 'st_v13', category: 'starters', name: 'Chilli Mushroom', description: 'Tossed button mushrooms with capsicum and chillies.', price: 250, tag: null, is_veg: true, is_available: true },
  { id: 'st_v14', category: 'starters', name: 'Mushroom 65', description: 'Crispy spicy fried mushrooms.', price: 250, tag: null, is_veg: true, is_available: true },
  { id: 'st_v15', category: 'starters', name: 'Gobi Manchuria', description: 'Crispy cauliflower in soy garlic sauce.', price: 190, tag: 'popular', is_veg: true, is_available: true },
  { id: 'st_v16', category: 'starters', name: 'Chilli Gobi', description: 'Spicy fried cauliflower bites.', price: 190, tag: null, is_veg: true, is_available: true },
  { id: 'st_v17', category: 'starters', name: 'Gobi 65', description: 'Traditional Gobi 65 fry.', price: 190, tag: null, is_veg: true, is_available: true },
  { id: 'st_v18', category: 'starters', name: 'Aloo 65', description: 'Crispy potato cubes in spicy 65 seasoning.', price: 190, tag: null, is_veg: true, is_available: true },

  // 2. STARTERS - CHICKEN STARTERS
  { id: 'st_c1', category: 'starters', name: 'Chicken 65', description: 'Deep fried spicy chicken morsels with curry leaves.', price: 230, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'st_c2', category: 'starters', name: 'Chilli Chicken', description: 'Wok tossed chicken with bell peppers and green chillies.', price: 230, tag: 'popular', is_veg: false, is_available: true },
  { id: 'st_c3', category: 'starters', name: 'Chicken Manchuria', description: 'Chicken in rich soya garlic Manchurian sauce.', price: 230, tag: null, is_veg: false, is_available: true },
  { id: 'st_c4', category: 'starters', name: 'Schezwan Chicken', description: 'Fiery Schezwan sauce coated chicken.', price: 230, tag: null, is_veg: false, is_available: true },
  { id: 'st_c5', category: 'starters', name: 'Garlic Chicken', description: 'Tender chicken tossed with roasted garlic.', price: 240, tag: null, is_veg: false, is_available: true },
  { id: 'st_c6', category: 'starters', name: 'Ginger Chicken', description: 'Zesty ginger spiced chicken fry.', price: 240, tag: null, is_veg: false, is_available: true },
  { id: 'st_c7', category: 'starters', name: 'Chicken Majestic', description: 'Thin chicken strips cooked in buttermilk & mint garlic sauce.', price: 250, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'st_c8', category: 'starters', name: 'Chicken 555', description: 'Spicy garlic fried chicken tossed with cashew nuts.', price: 250, tag: null, is_veg: false, is_available: true },
  { id: 'st_c9', category: 'starters', name: 'Dragon Chicken', description: 'Sweet and spicy fried chicken strips.', price: 250, tag: null, is_veg: false, is_available: true },
  { id: 'st_c10', category: 'starters', name: 'Crispy Chicken', description: 'Golden crunchy batter coated chicken strips.', price: 250, tag: null, is_veg: false, is_available: true },
  { id: 'st_c11', category: 'starters', name: 'Slice Chicken', description: 'Sliced chicken fillets fried in chef spices.', price: 250, tag: null, is_veg: false, is_available: true },
  { id: 'st_c12', category: 'starters', name: 'Diamond Chicken', description: 'Diced chicken in spicy Andhra masala coating.', price: 250, tag: null, is_veg: false, is_available: true },
  { id: 'st_c13', category: 'starters', name: 'Chicken Lollipop (6pcs)', description: 'Classic fried chicken wings formatted as lollipops.', price: 260, tag: 'popular', is_veg: false, is_available: true },
  { id: 'st_c14', category: 'starters', name: 'Chicken Drumstick (6pcs)', description: 'Juicy chicken drumsticks tossed in hot garlic sauce.', price: 260, tag: null, is_veg: false, is_available: true },
  { id: 'st_c15', category: 'starters', name: 'Stick Chicken', description: 'Skewered spiced chicken strips.', price: 270, tag: null, is_veg: false, is_available: true },
  { id: 'st_c16', category: 'starters', name: 'Chicken Kur Kure', description: 'Super crunchy battered chicken strips.', price: 270, tag: null, is_veg: false, is_available: true },
  { id: 'st_c17', category: 'starters', name: 'Basket Chicken', description: 'Crispy, generous, shareable signature fried chicken basket.', price: 351, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'st_c18', category: 'starters', name: 'Kaju Chicken', description: 'Crispy fried chicken tossed with roasted cashew nuts.', price: 300, tag: null, is_veg: false, is_available: true },
  { id: 'st_c19', category: 'starters', name: 'Pepper Chicken', description: 'Black pepper roasted spicy chicken.', price: 300, tag: null, is_veg: false, is_available: true },
  { id: 'st_c20', category: 'starters', name: 'Chicken Ghee Roast', description: 'Kundapur style chicken roasted in pure ghee.', price: 300, tag: 'must_try', is_veg: false, is_available: true },

  // 2. STARTERS - TANDOORI & KEBABS
  { id: 'st_t1', category: 'starters', name: 'Tandoori Chicken (Half)', description: 'Classic charcoal grilled chicken marinated in yogurt and spices.', price: 260, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'st_t2', category: 'starters', name: 'Tandoori Chicken (Full)', description: 'Full whole chicken marinated and roasted in clay oven.', price: 480, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'st_t3', category: 'starters', name: 'Chicken Tikka', description: 'Boneless chicken cubes grilled with fragrant spices.', price: 270, tag: 'popular', is_veg: false, is_available: true },
  { id: 'st_t4', category: 'starters', name: 'Chicken Malai Tikka', description: 'Creamy cardamom spiced tender grilled chicken.', price: 290, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'st_t5', category: 'starters', name: 'Reshmi Kebab', description: 'Minced chicken kebabs coated with egg white and spices.', price: 280, tag: null, is_veg: false, is_available: true },
  { id: 'st_t6', category: 'starters', name: 'Tangdi Kebab (3Pcs)', description: 'Marinated chicken leg pieces cooked in clay tandoor.', price: 290, tag: 'popular', is_veg: false, is_available: true },
  { id: 'st_t7', category: 'starters', name: 'Kalmi Kebab (3Pcs)', description: 'Cashew & cream rich marinated chicken drumsticks.', price: 300, tag: null, is_veg: false, is_available: true },
  { id: 'st_t8', category: 'starters', name: 'Paneer Tikka', description: 'Cottage cheese, capsicum & onions roasted on skewers.', price: 240, tag: 'bestseller', is_veg: true, is_available: true },
  { id: 'st_t9', category: 'starters', name: 'Mushroom Tikka', description: 'Spiced button mushrooms tandoori roasted.', price: 240, tag: null, is_veg: true, is_available: true },
  { id: 'st_t10', category: 'starters', name: 'Hara Bhara Kebab', description: 'Crispy spinach and green peas vegetable patties.', price: 210, tag: null, is_veg: true, is_available: true },

  // 2. STARTERS - EGG, MUTTON & SEA FOOD
  { id: 'st_e1', category: 'starters', name: 'Egg 65', description: 'Spicy batter fried boil eggs.', price: 190, tag: null, is_veg: false, is_available: true },
  { id: 'st_e2', category: 'starters', name: 'Egg Manchuria', description: 'Boiled eggs in Manchurian gravy.', price: 190, tag: null, is_veg: false, is_available: true },
  { id: 'st_e3', category: 'starters', name: 'Chilli Egg', description: 'Wok tossed chilli egg strips.', price: 190, tag: null, is_veg: false, is_available: true },
  { id: 'st_m1', category: 'starters', name: 'Mutton Fry', description: 'Spicy tender mutton pan fry with dark roasted masala.', price: 390, tag: 'popular', is_veg: false, is_available: true },
  { id: 'st_m2', category: 'starters', name: 'Pepper Mutton', description: 'Crushed black pepper mutton fry.', price: 390, tag: null, is_veg: false, is_available: true },
  { id: 'st_m3', category: 'starters', name: 'Mutton Ghee Roast', description: 'Slow cooked mutton in pure ghee.', price: 410, tag: null, is_veg: false, is_available: true },
  { id: 'st_f1', category: 'starters', name: 'Fish 65', description: 'Boneless fish fillets fried in 65 masala.', price: 300, tag: null, is_veg: false, is_available: true },
  { id: 'st_f2', category: 'starters', name: 'Fish Manchuria', description: 'Fish cubes tossed in soy Manchurian sauce.', price: 300, tag: null, is_veg: false, is_available: true },
  { id: 'st_f3', category: 'starters', name: 'Chilli Fish', description: 'Spicy chilli garlic fish.', price: 300, tag: null, is_veg: false, is_available: true },
  { id: 'st_f4', category: 'starters', name: 'Fish Majestic', description: 'Crispy fish strips tossed in sour yogurt garlic sauce.', price: 310, tag: null, is_veg: false, is_available: true },
  { id: 'st_f5', category: 'starters', name: 'Crispy Fish', description: 'Golden breaded fried fish fillets.', price: 310, tag: null, is_veg: false, is_available: true },
  { id: 'st_p1', category: 'starters', name: 'Prawns 65', description: 'Crispy marinated prawns deep fried with curry leaves.', price: 340, tag: 'popular', is_veg: false, is_available: true },
  { id: 'st_p2', category: 'starters', name: 'Chilli Prawns', description: 'Chilli garlic wok tossed prawns.', price: 340, tag: null, is_veg: false, is_available: true },
  { id: 'st_p3', category: 'starters', name: 'Garlic Prawns', description: 'Golden prawns cooked with fragrant garlic.', price: 340, tag: null, is_veg: false, is_available: true },
  { id: 'st_p4', category: 'starters', name: 'Prawns Manchuria', description: 'Juicy prawns in Manchurian sauce.', price: 340, tag: null, is_veg: false, is_available: true },
  { id: 'st_p5', category: 'starters', name: 'Loose Prawns', description: 'Crispy garlic pepper fried prawns.', price: 340, tag: null, is_veg: false, is_available: true },

  // 3. CURRIES - VEG CURRIES
  { id: 'cur_v1', category: 'mains', name: 'Dal Tadka', description: 'Yellow lentils tempered with cumin, garlic & red chillies.', price: 200, tag: 'popular', is_veg: true, is_available: true },
  { id: 'cur_v2', category: 'mains', name: 'Dal Fry', description: 'Classic dhabha style spiced lentil curry.', price: 190, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v22', category: 'mains', name: 'Dal Makhani', description: 'Slow cooked black lentils simmered with butter and cream overnight.', price: 220, tag: 'popular', is_veg: true, is_available: true },
  { id: 'cur_v3', category: 'mains', name: 'Paneer Butter Masala', description: 'Cottage cheese cubes in rich velvety tomato butter gravy.', price: 240, tag: 'bestseller', is_veg: true, is_available: true },
  { id: 'cur_v23', category: 'mains', name: 'Kaju Paneer Curry', description: 'Fried paneer & whole cashew nuts in creamy onion gravy.', price: 260, tag: 'bestseller', is_veg: true, is_available: true },
  { id: 'cur_v4', category: 'mains', name: 'Paneer Dopiyazo', description: 'Paneer cooked with double onions and aromatic herbs.', price: 240, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v5', category: 'mains', name: 'Kadai Paneer', description: 'Paneer cooked with crushed spices and fresh bell peppers.', price: 240, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v6', category: 'mains', name: 'Shahi Paneer', description: 'Rich royal paneer curry in cashew cream sauce.', price: 250, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v7', category: 'mains', name: 'Lacha Paneer', description: 'Layered paneer cooked in special tomato gravy.', price: 250, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v8', category: 'mains', name: 'Paneer Kheema Masala', description: 'Minced paneer cooked with onions, tomatoes & spices.', price: 250, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v9', category: 'mains', name: 'Palak Paneer', description: 'Paneer cubes in smooth spinach puree.', price: 250, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v10', category: 'mains', name: 'Plain Palak', description: 'Tempered spinach curry.', price: 200, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v11', category: 'mains', name: 'Methi Chaman', description: 'Kashmiri style fenugreek & paneer curry.', price: 250, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v12', category: 'mains', name: 'Paneer Tikka Masala', description: 'Charcoal roasted paneer tikka in spiced gravy.', price: 270, tag: 'must_try', is_veg: true, is_available: true },
  { id: 'cur_v24', category: 'mains', name: 'Malai Kofta', description: 'Melt-in-mouth cottage cheese dumplings in rich cashew gravy.', price: 250, tag: 'must_try', is_veg: true, is_available: true },
  { id: 'cur_v13', category: 'mains', name: 'Veg Kolhapuri', description: 'Mixed vegetables in a fiery Maharashtrian red gravy.', price: 210, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v14', category: 'mains', name: 'Veg Jaipuri', description: 'Rajasthani style vegetable curry topped with papad.', price: 210, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v15', category: 'mains', name: 'Veg Nizami Handi', description: 'Hyderabadi style vegetable handi gravy.', price: 230, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v16', category: 'mains', name: 'Veg Navaratna Khurma', description: 'Sweet and creamy 9-gem vegetable curry.', price: 230, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v17', category: 'mains', name: 'Kadai Veg', description: 'Assorted vegetables cooked with crushed coriander.', price: 230, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v18', category: 'mains', name: 'Mixed Veg Curry', description: 'Homestyle mixed vegetable curry.', price: 210, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v19', category: 'mains', name: 'Tamota Kaju Curry', description: 'Rich roasted cashew nut tomato curry.', price: 230, tag: 'popular', is_veg: true, is_available: true },
  { id: 'cur_v20', category: 'mains', name: 'Mushroom Masala', description: 'Button mushrooms cooked in onion tomato gravy.', price: 240, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v21', category: 'mains', name: 'Green Peas Masala', description: 'Tender green peas in rich spiced curry.', price: 210, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v25', category: 'mains', name: 'Aloo Gobi Masala', description: 'Homestyle spiced potato and cauliflower curry.', price: 210, tag: null, is_veg: true, is_available: true },
  { id: 'cur_v26', category: 'mains', name: 'Chana Masala', description: 'Peshawari spiced chickpea curry.', price: 190, tag: null, is_veg: true, is_available: true },

  // 3. CURRIES - NON VEG CURRIES
  { id: 'cur_nv1', category: 'mains', name: 'Butter Chicken', description: 'Tender tandoori chicken cooked in rich makhani gravy.', price: 260, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'cur_nv22', category: 'mains', name: 'Gongura Kodi Kura', description: 'Signature Andhra chicken cooked with tangy sorrel leaves.', price: 280, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'cur_nv23', category: 'mains', name: 'Natu Kodi Kura', description: 'Traditional country chicken cooked in spicy rustic gravy.', price: 340, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'cur_nv24', category: 'mains', name: 'Telangana Kodi Kura', description: 'Fiery Rayalaseema & Telangana style spicy chicken gravy.', price: 280, tag: 'popular', is_veg: false, is_available: true },
  { id: 'cur_nv25', category: 'mains', name: 'Ulavacharu Chicken Curry', description: 'Rich horsegram reduction slow cooked with chicken.', price: 290, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'cur_nv2', category: 'mains', name: 'Kadai Chicken', description: 'Chicken cooked in wok with coriander seeds and capsicum.', price: 260, tag: 'popular', is_veg: false, is_available: true },
  { id: 'cur_nv3', category: 'mains', name: 'Chicken Dopiyazo', description: 'Chicken cooked with abundant sauteed onions.', price: 260, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv4', category: 'mains', name: 'Handi Chicken', description: 'Slow cooked chicken curry in earthenware handi.', price: 270, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv5', category: 'mains', name: 'Chicken Kolhapuri', description: 'Fiery spicy Kolhapuri style chicken.', price: 270, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv6', category: 'mains', name: 'Chicken Tikka Masala', description: 'Smoky chicken tikka pieces in creamy tomato masala.', price: 280, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'cur_nv7', category: 'mains', name: 'Afghani Chicken Curry', description: 'Mild and creamy cashew cream chicken curry.', price: 280, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv8', category: 'mains', name: 'Chicken Maharani', description: 'Royal chicken curry with almond paste and saffron.', price: 260, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv9', category: 'mains', name: 'Dumka Chicken', description: 'Hyderabadi dum cooked chicken in rich gravy.', price: 280, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv10', category: 'mains', name: 'Chicken Masala', description: 'Classic spicy North Indian chicken curry.', price: 260, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv11', category: 'mains', name: 'Kaju Chicken Curry', description: 'Rich chicken curry thickened with roasted cashew paste.', price: 290, tag: 'popular', is_veg: false, is_available: true },
  { id: 'cur_nv12', category: 'mains', name: 'Methi Chicken Curry', description: 'Chicken curry infused with fresh fenugreek leaves.', price: 260, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv13', category: 'mains', name: 'Tangdi Chicken Masala', description: 'Roasted chicken drumsticks in rich spicy gravy.', price: 300, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv14', category: 'mains', name: 'Punjabi Chicken', description: 'Rich Punjabi style thick chicken gravy.', price: 300, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv15', category: 'mains', name: 'Chicken Fry', description: 'Spicy dry chicken fry.', price: 280, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv16', category: 'mains', name: 'Darbar\'s Spl. Chicken Curry', description: 'Chef special signature chicken curry.', price: 320, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'cur_nv26', category: 'mains', name: 'Egg Masala Curry', description: 'Boiled eggs cooked in rich spicy onion tomato gravy.', price: 210, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv27', category: 'mains', name: 'Egg Kheema Curry', description: 'Grated eggs sautéed with ground spices & chillies.', price: 190, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv17', category: 'mains', name: 'Mutton Curry', description: 'Traditional Andhra style mutton curry.', price: 370, tag: 'popular', is_veg: false, is_available: true },
  { id: 'cur_nv28', category: 'mains', name: 'Gongura Mutton Curry', description: 'Tender mutton pieces cooked with sour sorrel leaves.', price: 390, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'cur_nv29', category: 'mains', name: 'Mutton Kheema Curry', description: 'Minced mutton slow cooked with green peas & spices.', price: 410, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'cur_nv18', category: 'mains', name: 'Mutton Masala', description: 'Thick spicy mutton gravy.', price: 370, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv19', category: 'mains', name: 'Kadai Mutton', description: 'Mutton cooked with wok spices and capsicum.', price: 370, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv20', category: 'mains', name: 'Fish Curry', description: 'Tangy tamarind fish curry.', price: 300, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv30', category: 'mains', name: 'Nellore Chepala Pulusu', description: 'Authentic raw mango & tamarind coastal fish curry.', price: 330, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'cur_nv21', category: 'mains', name: 'Prawns Curry', description: 'Spicy coastal prawns curry.', price: 330, tag: null, is_veg: false, is_available: true },
  { id: 'cur_nv31', category: 'mains', name: 'Royyala Iguru', description: 'Rich thick spicy prawns fry gravy.', price: 360, tag: 'must_try', is_veg: false, is_available: true },

  // 4. ROTIS, NAANS, FRIED RICE & NOODLES
  { id: 'brd_1', category: 'breads', name: 'Tandoori Roti', description: 'Whole wheat tandoori roti baked in clay oven.', price: 25, tag: null, is_veg: true, is_available: true },
  { id: 'brd_2', category: 'breads', name: 'Butter Roti', description: 'Clay oven baked roti brushed with fresh butter.', price: 30, tag: null, is_veg: true, is_available: true },
  { id: 'brd_3', category: 'breads', name: 'Plain Naan', description: 'Refined flour soft tandoori flatbread.', price: 40, tag: null, is_veg: true, is_available: true },
  { id: 'brd_4', category: 'breads', name: 'Butter Naan', description: 'Fluffy naan bread glazed with pure butter.', price: 50, tag: 'bestseller', is_veg: true, is_available: true },
  { id: 'brd_5', category: 'breads', name: 'Garlic Naan', description: 'Freshly baked naan topped with minced garlic & butter.', price: 60, tag: 'popular', is_veg: true, is_available: true },
  { id: 'brd_6', category: 'breads', name: 'Cheese Garlic Naan', description: 'Stuffed cheese naan infused with roasted garlic.', price: 80, tag: 'must_try', is_veg: true, is_available: true },
  { id: 'brd_7', category: 'breads', name: 'Rumali Roti', description: 'Thin handkerchief bread folded soft.', price: 35, tag: null, is_veg: true, is_available: true },
  { id: 'brd_8', category: 'breads', name: 'Plain Kulcha', description: 'Soft leavened tandoori bread.', price: 45, tag: null, is_veg: true, is_available: true },
  { id: 'brd_9', category: 'breads', name: 'Masala Kulcha', description: 'Spiced potato and onion stuffed flatbread.', price: 60, tag: null, is_veg: true, is_available: true },
  { id: 'rc_1', category: 'breads', name: 'Veg Fried Rice', description: 'Wok tossed basmati rice with diced garden vegetables.', price: 180, tag: null, is_veg: true, is_available: true },
  { id: 'rc_2', category: 'breads', name: 'Egg Fried Rice', description: 'Classic wok fried rice with scrambled eggs and spring onions.', price: 200, tag: null, is_veg: false, is_available: true },
  { id: 'rc_3', category: 'breads', name: 'Chicken Fried Rice', description: 'Flavored basmati rice fried with chicken pieces.', price: 230, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'rc_4', category: 'breads', name: 'Schezwan Chicken Fried Rice', description: 'Spicy Schezwan sauce tossed chicken fried rice.', price: 240, tag: 'popular', is_veg: false, is_available: true },
  { id: 'rc_5', category: 'breads', name: 'Kaju Veg Fried Rice', description: 'Special ghee fried rice loaded with fried cashew nuts.', price: 220, tag: null, is_veg: true, is_available: true },
  { id: 'nd_1', category: 'breads', name: 'Veg Soft Noodles', description: 'Indo-Chinese style wok fried vegetable noodles.', price: 180, tag: null, is_veg: true, is_available: true },
  { id: 'nd_2', category: 'breads', name: 'Chicken Soft Noodles', description: 'Wok tossed soft noodles with shredded chicken.', price: 230, tag: null, is_veg: false, is_available: true },
  { id: 'nd_3', category: 'breads', name: 'Schezwan Chicken Noodles', description: 'Fiery red Schezwan pepper chicken noodles.', price: 240, tag: null, is_veg: false, is_available: true },

  // 5. MANDI
  { id: 'mandi_1', category: 'mandi', name: 'Mix. Veg Mandi (1 Member)', description: 'Spiced mandi rice with fried veg kebabs.', price: 180, tag: null, is_veg: true, is_available: true },
  { id: 'mandi_2', category: 'mandi', name: 'Paneer Mandi (1 Member)', description: 'Mandi rice topped with grilled Paneer tikka.', price: 210, tag: null, is_veg: true, is_available: true },
  { id: 'mandi_3', category: 'mandi', name: 'Paneer Mandi (2 Member)', description: 'Platter for 2 with double Paneer tikka.', price: 370, tag: null, is_veg: true, is_available: true },
  { id: 'mandi_4', category: 'mandi', name: 'Mushroom Mandi (1 Member)', description: 'Mandi rice served with roasted spiced mushrooms.', price: 210, tag: null, is_veg: true, is_available: true },
  { id: 'mandi_5', category: 'mandi', name: 'Chicken Mandi 1 Pc', description: 'Classic Yemeni mandi rice with 1 pc chicken.', price: 240, tag: 'popular', is_veg: false, is_available: true },
  { id: 'mandi_6', category: 'mandi', name: 'Chicken Mandi 2 Pc', description: 'Double piece chicken mandi platter.', price: 460, tag: null, is_veg: false, is_available: true },
  { id: 'mandi_7', category: 'mandi', name: 'Chicken Mandi Family', description: 'Grand family Mandi feast platter.', price: 1099, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'mandi_8', category: 'mandi', name: 'Chicken Juicy Mandi 1Pc', description: 'Mandi rice served with tender juicy roast chicken.', price: 290, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'mandi_9', category: 'mandi', name: 'Chi. Tandoori / Alfam Mandi 1Pc', description: 'Smoky Alfam tandoori chicken Mandi.', price: 290, tag: null, is_veg: false, is_available: true },
  { id: 'mandi_10', category: 'mandi', name: 'Mutton Mandi 1 Pc', description: 'Tender slow cooked mutton mandi rice.', price: 309, tag: 'popular', is_veg: false, is_available: true },
  { id: 'mandi_11', category: 'mandi', name: 'Mutton Juicy Mandi Family', description: 'Grand Mutton Mandi family feast.', price: 1209, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'mandi_12', category: 'mandi', name: 'Fish Mandi 1 Pc', description: 'Crispy fried fish fillet over mandi rice.', price: 300, tag: null, is_veg: false, is_available: true },

  // 6. PULAVS & BIRYANIS
  { id: 'pul_1', category: 'pulavs', name: 'Veg Pulao', description: 'Aromatic basmati rice cooked with mixed vegetables.', price: 180, tag: null, is_veg: true, is_available: true },
  { id: 'pul_2', category: 'pulavs', name: 'Paneer Pulao', description: 'Flavored pulao rice with cottage cheese cubes.', price: 200, tag: null, is_veg: true, is_available: true },
  { id: 'pul_3', category: 'pulavs', name: 'Kaju Pulao', description: 'Rich ghee pulao loaded with roasted cashews.', price: 230, tag: null, is_veg: true, is_available: true },
  { id: 'pul_4', category: 'pulavs', name: 'Gongura Paneer Pulao', description: 'Tangy sorrel leaf pulao with paneer.', price: 240, tag: null, is_veg: true, is_available: true },
  { id: 'pul_5', category: 'pulavs', name: 'Chicken Pulao', description: 'Homestyle chicken pulao with pure ghee.', price: 240, tag: null, is_veg: false, is_available: true },
  { id: 'pul_6', category: 'pulavs', name: 'Ulavacharu Kodi Pulao', description: 'Horse gram soup infused chicken pulao.', price: 250, tag: 'popular', is_veg: false, is_available: true },
  { id: 'pul_7', category: 'pulavs', name: 'Gongura Kodi Pulao', description: 'Tangy sorrel leaves chicken pulao.', price: 250, tag: null, is_veg: false, is_available: true },
  { id: 'pul_8', category: 'pulavs', name: 'Rajugari Kodi Pulao', description: 'Traditional Godavari style spicy chicken pulao.', price: 260, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'pul_9', category: 'pulavs', name: 'Mutton Pulao', description: 'Seared mutton cooked with basmati rice.', price: 390, tag: null, is_veg: false, is_available: true },
  { id: 'pul_10', category: 'pulavs', name: 'Royyala Pulao', description: 'Aromatic prawn pulao with coastal spices.', price: 360, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'pul_11', category: 'pulavs', name: 'Teenmar (Mixed Nonveg) Pulao', description: 'Special grand pulao with chicken, mutton & prawns.', price: 430, tag: 'must_try', is_veg: false, is_available: true },
  { id: 'bir_1', category: 'pulavs', name: 'Veg Biryani', description: 'Fragrant vegetable dum biryani.', price: 240, tag: null, is_veg: true, is_available: true },
  { id: 'bir_2', category: 'pulavs', name: 'Chicken Biryani', description: 'Hyderabadi dum biryani with tender chicken.', price: 270, tag: 'bestseller', is_veg: false, is_available: true },
  { id: 'bir_3', category: 'pulavs', name: 'Mutton Fry Piece Biryani', description: 'Basmati dum rice served with spicy mutton fry.', price: 390, tag: 'popular', is_veg: false, is_available: true },
  { id: 'bir_4', category: 'pulavs', name: 'Spl. Chicken Biryani', description: 'Boneless chicken special dum biryani.', price: 360, tag: null, is_veg: false, is_available: true },

  // 7. DESSERTS & BEVERAGES
  { id: 'des_1', category: 'desserts', name: 'Apricot Delight', description: 'Classic Hyderabadi dessert made with dried apricots and cream.', price: 120, tag: 'bestseller', is_veg: true, is_available: true },
  { id: 'des_2', category: 'desserts', name: 'Double Ka Meetha', description: 'Fried bread soaked in saffron spiced milk and cardamom.', price: 40, tag: null, is_veg: true, is_available: true },
  { id: 'des_3', category: 'desserts', name: 'Kadu Ki Kheer', description: 'Bottle gourd dessert pudding with dry fruits.', price: 40, tag: null, is_veg: true, is_available: true },
  { id: 'des_4', category: 'desserts', name: 'Gulab Jamun', description: 'Soft milk dumplings soaked in rose sugar syrup.', price: 40, tag: null, is_veg: true, is_available: true },
  { id: 'des_5', category: 'desserts', name: 'Qurbani Ka Meeta', description: 'Rich apricot compote served warm.', price: 40, tag: null, is_veg: true, is_available: true },
  { id: 'bev_1', category: 'desserts', name: 'Soft Drink 200ml', description: 'Chilled carbonated beverage.', price: 20, tag: null, is_veg: true, is_available: true },
  { id: 'bev_2', category: 'desserts', name: 'Soft Drink 300ml', description: 'Chilled carbonated beverage.', price: 25, tag: null, is_veg: true, is_available: true },
  { id: 'bev_3', category: 'desserts', name: 'Water Bottle', description: 'Packaged drinking water bottle.', price: 20, tag: null, is_veg: true, is_available: true },
  { id: 'bev_4', category: 'desserts', name: 'Goli Sada', description: 'Traditional Indian marble soda.', price: 40, tag: 'popular', is_veg: true, is_available: true }
];

const INITIAL_LOYALTY_OFFERS = [
  { id: '1', title: '10% OFF Bill', track: 'track1', discount_type: 'percent', value: '10', active: true },
  { id: '2', title: '15% OFF Bill', track: 'track1', discount_type: 'percent', value: '15', active: true },
  { id: '3', title: '1 Free Biryani', track: 'track1', discount_type: 'free_item', value: 'biryani', active: true },
  { id: '4', title: '1 Free Dessert', track: 'track1', discount_type: 'free_item', value: 'dessert', active: true },
  { id: '5', title: '₹2000+ Instant Rewards', track: 'track2', discount_type: 'instant', value: 'instant_2000', active: true }
];

const INITIAL_VISITS = [
  { id: 'v1', customer_name: 'Rahul Dasari', email: 'rahul@dasarisdarbar.com', phone: '9876543210', bill_number: 'DD-1048', bill_amount: 1480, track: 'under_2000', verified: true, visit_date: '2026-09-01' },
  { id: 'v2', customer_name: 'Rahul Dasari', email: 'rahul@dasarisdarbar.com', phone: '9876543210', bill_number: 'DD-1092', bill_amount: 1250, track: 'under_2000', verified: true, visit_date: '2026-09-04' },
  { id: 'v3', customer_name: 'Rahul Dasari', email: 'rahul@dasarisdarbar.com', phone: '9876543210', bill_number: 'DD-1150', bill_amount: 1600, track: 'under_2000', verified: true, visit_date: '2026-09-08' }
];

const INITIAL_BOOKINGS = [
  { id: 'b1', name: 'Srinivas Rao', phone: '9123456780', party_size: 4, booking_date: '2026-09-15', booking_time: '19:30', notes: 'Window table preferred', status: 'confirmed' },
  { id: 'b2', name: 'Anitha Reddy', phone: '9876501234', party_size: 6, booking_date: '2026-09-16', booking_time: '20:00', notes: 'Birthday celebration', status: 'pending' }
];

const getStorage = (key, defaultVal) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const setStorage = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage save error:', e);
  }
};

export const localStoreManager = {
  // --- MENU COLLECTION ---
  getMenuItems: () => {
    const saved = getStorage('dd_menu', null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      return INITIAL_MENU;
    }
    // Auto-merge any newly added dishes from INITIAL_MENU so no dish is missing
    const savedIds = new Set(saved.map(item => item.id));
    const missingItems = INITIAL_MENU.filter(item => !savedIds.has(item.id));
    if (missingItems.length > 0) {
      const merged = [...saved, ...missingItems];
      setStorage('dd_menu', merged);
      return merged;
    }
    return saved;
  },
  saveMenuItems: (items) => setStorage('dd_menu', items),
  resetMenuItems: () => {
    setStorage('dd_menu', INITIAL_MENU);
    return INITIAL_MENU;
  },
  addMenuItem: (item) => {
    const menu = localStoreManager.getMenuItems();
    const newItem = {
      id: 'm_' + Date.now(),
      ...item,
      sort_order: menu.length + 1
    };
    menu.push(newItem);
    localStoreManager.saveMenuItems(menu);
    return newItem;
  },
  deleteMenuItem: (id) => {
    const menu = localStoreManager.getMenuItems().filter(item => item.id !== id);
    localStoreManager.saveMenuItems(menu);
    return menu;
  },

  // --- LOYALTY OFFERS (ADMIN-MANAGED REWARD POOL) ---
  getLoyaltyOffers: () => loyaltyEngine.getOffers(),
  saveLoyaltyOffers: (offers) => loyaltyEngine.saveOffers(offers),
  addLoyaltyOffer: (offer) => loyaltyEngine.addOffer(offer),
  updateLoyaltyOffer: (id, updatedFields) => loyaltyEngine.updateOffer(id, updatedFields),
  toggleOfferActive: (id) => loyaltyEngine.toggleOfferActive(id),
  deleteLoyaltyOffer: (id) => loyaltyEngine.deleteOffer(id),
  getOfferUsage: (offerId) => {
    const rewards = loyaltyEngine.getRewards();
    return rewards.filter(r => r.originalOfferId === offerId).length;
  },

  // --- VISITS & STREAKS ---
  getVisits: () => getStorage('dd_visits', INITIAL_VISITS),
  saveVisits: (visits) => setStorage('dd_visits', visits),

  getCustomerStreak: (identifier = '9876543210') => {
    const visits = localStoreManager.getVisits();
    const idClean = String(identifier || '').trim().toLowerCase();
    const verifiedTrack1 = visits.filter(v => {
      const phoneMatch = v.phone && String(v.phone).trim().toLowerCase() === idClean;
      const emailMatch = v.email && String(v.email).trim().toLowerCase() === idClean;
      return (phoneMatch || emailMatch || !identifier) && v.verified && v.track === 'under_2000';
    });
    return verifiedTrack1.length % 5;
  },

  addVisit: async (visitData) => {
    const visits = localStoreManager.getVisits();
    const amount = Number(visitData.bill_amount);
    const isOver2000 = amount >= 2000;
    
    // Check previous streak for this phone or email
    const idClean = String(visitData.phone || visitData.email || '').trim().toLowerCase();
    const prevVisits = visits.filter(v => {
      const phoneMatch = v.phone && String(v.phone).trim().toLowerCase() === idClean;
      const emailMatch = v.email && String(v.email).trim().toLowerCase() === idClean;
      return (phoneMatch || emailMatch) && v.verified && v.track === 'under_2000';
    });
    const newStreakCount = (prevVisits.length + (isOver2000 ? 0 : 1)) % 5;

    let unlockedReward = null;
    const randomCodeSuffix = Math.floor(1000 + Math.random() * 9000);

    if (isOver2000) {
      unlockedReward = {
        title: '🎉 ₹2,000+ INSTANT BIG BILL REWARD',
        description: 'Instant reward unlocked for spending ₹2,000+! Claim 1 Free Signature Biryani or 1 Apricot Delight Dessert.',
        code: `DARBAR-INSTANT2K-${randomCodeSuffix}`
      };
    } else if (newStreakCount === 0 && prevVisits.length > 0) {
      unlockedReward = {
        title: '🏆 5-VISIT STREAK MASTER REWARD',
        description: 'Congratulations! You reached 5 qualifying visits at Dasari\'s Darbar. Claim 15% OFF your total bill or 1 Free Starter!',
        code: `DARBAR-STREAK5-${randomCodeSuffix}`
      };
    }

    const newVisit = {
      id: 'v_' + Date.now(),
      customer_name: visitData.customer_name || 'Guest Customer',
      email: visitData.email || 'customer@example.com',
      phone: visitData.phone || '9876543210',
      bill_number: visitData.bill_number,
      bill_amount: amount,
      track: isOver2000 ? 'over_2000' : 'under_2000',
      verified: true,
      visit_date: new Date().toISOString().split('T')[0],
      reward_code: unlockedReward ? unlockedReward.code : null
    };

    visits.unshift(newVisit);
    localStoreManager.saveVisits(visits);

    return { newVisit, reward: unlockedReward };
  },

  deleteVisit: (visitId) => {
    const visits = localStoreManager.getVisits().filter(v => v.id !== visitId);
    localStoreManager.saveVisits(visits);
    return visits;
  },

  // --- BOOKINGS COLLECTION ---
  getBookings: () => getStorage('dd_bookings', INITIAL_BOOKINGS),
  saveBookings: (bookings) => setStorage('dd_bookings', bookings),

  addBooking: async (bookingData) => {
    const bookings = localStoreManager.getBookings();
    const todayStr = new Date().toISOString().split('T')[0];

    const newBooking = {
      id: 'b_' + Date.now(),
      name: bookingData.name,
      phone: bookingData.phone,
      party_size: Number(bookingData.party_size || 2),
      table_number: Number(bookingData.table_number || 1),
      booking_date: bookingData.booking_date || todayStr,
      booking_time: bookingData.booking_time || '19:30',
      notes: bookingData.notes || '',
      status: 'confirmed',
      created_at: new Date().toISOString()
    };

    bookings.unshift(newBooking);
    localStoreManager.saveBookings(bookings);
    return newBooking;
  },

  deleteBooking: (bookingId) => {
    const bookings = localStoreManager.getBookings().filter(b => b.id !== bookingId);
    localStoreManager.saveBookings(bookings);
    return bookings;
  },

  // --- LOCAL TEST CUSTOMER PROFILES (FOR LOCAL EXPERIMENTING) ---
  getTestProfiles: () => [
    {
      id: 'cust_sai',
      name: 'Sai',
      email: 'sai@example.com',
      phone: '9876543210',
      tag: '⭐ Key Tester: Sai (4/5 Streak - Next Bill Unlocks Reward!)'
    },
    {
      id: 'cust_rahul',
      name: 'Rahul Dasari',
      email: 'rahul@dasarisdarbar.com',
      phone: '9876543211',
      tag: 'Loyal Regular (3/5 Visits)'
    },
    {
      id: 'cust_priya',
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '9812345678',
      tag: 'Fresh Customer (0/5 Visits)'
    },
    {
      id: 'cust_vikram',
      name: 'Vikram Reddy',
      email: 'vikram.reddy@example.com',
      phone: '9700554433',
      tag: 'Big Spender (Track 2 Tester)'
    }
  ],

  getCurrentCustomer: () => {
    return getStorage('dd_current_customer', null);
  },

  setCurrentCustomer: (customer) => {
    if (!customer) {
      localStoreManager.clearCurrentCustomer();
      return null;
    }
    setStorage('dd_current_customer', customer);
    // Also ensure loyaltyEngine has the customer record
    loyaltyEngine.getCustomerAccount(customer.id);
    return customer;
  },

  clearCurrentCustomer: () => {
    try {
      localStorage.removeItem('dd_current_customer');
    } catch (e) {
      console.error(e);
    }
  },

  logoutCustomer: () => {
    localStoreManager.clearCurrentCustomer();
  },

  getRegisteredUsers: () => {
    return getStorage('dd_registered_users', [
      {
        id: 'cust_sai',
        name: 'Sai',
        email: 'sai@example.com',
        password: 'password123',
        phone: '9876543210',
        authProvider: 'email'
      },
      {
        id: 'cust_rahul',
        name: 'Rahul Dasari',
        email: 'rahul@dasarisdarbar.com',
        password: 'password123',
        phone: '9876543211',
        authProvider: 'email'
      },
      {
        id: 'cust_priya',
        name: 'Priya Sharma',
        email: 'priya@example.com',
        password: 'password123',
        phone: '9812345678',
        authProvider: 'email'
      }
    ]);
  },

  saveRegisteredUsers: (users) => {
    setStorage('dd_registered_users', users);
    return users;
  },

  loginCustomerWithEmail: (email, password) => {
    if (!email || !password) {
      return { success: false, message: 'Please enter both email and password.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const users = localStoreManager.getRegisteredUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'Account not found with this email. Please check or create an account.' };
    }
    if (user.password && user.password !== password) {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    // Set logged in customer
    const customerObj = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '9876543210',
      authProvider: 'email'
    };
    localStoreManager.setCurrentCustomer(customerObj);
    return { success: true, customer: customerObj };
  },

  registerCustomerWithEmail: ({ name, email, password, phone }) => {
    if (!name || !email || !password) {
      return { success: false, message: 'Please fill in your name, email and password.' };
    }
    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const users = localStoreManager.getRegisteredUsers();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'An account with this email already exists. Please sign in instead.' };
    }

    const newId = 'cust_' + Date.now();
    const newUser = {
      id: newId,
      name: name.trim(),
      email: cleanEmail,
      password: password,
      phone: phone ? phone.trim() : '9876543210',
      authProvider: 'email'
    };

    users.push(newUser);
    localStoreManager.saveRegisteredUsers(users);

    // Register with loyaltyEngine
    loyaltyEngine.saveCustomerAccount({
      id: newId,
      name: newUser.name,
      phone: newUser.phone,
      email: newUser.email,
      track1Streak: 0,
      createdAt: new Date().toISOString()
    });

    localStoreManager.setCurrentCustomer(newUser);
    return { success: true, customer: newUser };
  },

  loginCustomerWithGoogle: (googleData = {}) => {
    const email = googleData.email || 'guest.user@gmail.com';
    const name = googleData.name || (email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    const cleanEmail = email.trim().toLowerCase();
    
    const users = localStoreManager.getRegisteredUsers();
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      const newId = googleData.id || ('cust_g_' + Date.now().toString(36));
      user = {
        id: newId,
        name: name,
        email: cleanEmail,
        phone: googleData.phone || '',
        authProvider: 'google',
        photoURL: googleData.photoURL || null
      };
      users.push(user);
      localStoreManager.saveRegisteredUsers(users);

      loyaltyEngine.saveCustomerAccount({
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        track1Streak: 0,
        createdAt: new Date().toISOString()
      });
    }

    localStoreManager.setCurrentCustomer(user);
    return { success: true, customer: user };
  },

  // --- LOYALTY ENGINE CONVENIENCE HOOKS ---
  loyalty: loyaltyEngine,
  getLoyaltyClaims: () => loyaltyEngine.getClaims(),
  getLoyaltyRewards: () => loyaltyEngine.getRewards(),
  getLoyaltyCoupons: () => loyaltyEngine.getCoupons(),
  getLoyaltyConfig: () => loyaltyEngine.getConfig(),
  saveLoyaltyConfig: (cfg) => loyaltyEngine.saveConfig(cfg),
  redeemVoucher: (code, notes) => loyaltyEngine.redeemVoucher(code, notes),
  approvePendingClaim: (id, data) => loyaltyEngine.approvePendingClaim(id, data),
  rejectPendingClaim: (id, reason) => loyaltyEngine.rejectPendingClaim(id, reason),

  // --- BACKUP, EXPORT & RESET UTILITIES ---
  exportDataJSON: () => {
    const data = {
      exportedAt: new Date().toISOString(),
      mode: 'offline_local_storage',
      menu: localStoreManager.getMenuItems(),
      visits: localStoreManager.getVisits(),
      bookings: localStoreManager.getBookings(),
      loyaltyOffers: localStoreManager.getLoyaltyOffers(),
      loyaltyConfig: loyaltyEngine.getConfig(),
      loyaltyClaims: loyaltyEngine.getClaims(),
      loyaltyRewards: loyaltyEngine.getRewards(),
      loyaltyCoupons: loyaltyEngine.getCoupons(),
      loyaltyAccounts: loyaltyEngine.getAllCustomers()
    };
    return JSON.stringify(data, null, 2);
  },

  importDataJSON: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.menu) localStoreManager.saveMenuItems(data.menu);
      if (data.visits) localStoreManager.saveVisits(data.visits);
      if (data.bookings) localStoreManager.saveBookings(data.bookings);
      if (data.loyaltyOffers) localStoreManager.saveLoyaltyOffers(data.loyaltyOffers);
      if (data.loyaltyConfig) loyaltyEngine.saveConfig(data.loyaltyConfig);
      if (data.loyaltyClaims) loyaltyEngine.saveClaims(data.loyaltyClaims);
      if (data.loyaltyRewards) loyaltyEngine.saveRewards(data.loyaltyRewards);
      if (data.loyaltyCoupons) loyaltyEngine.saveCoupons(data.loyaltyCoupons);
      return { success: true, message: 'All local data imported successfully.' };
    } catch (err) {
      return { success: false, message: 'Invalid JSON format: ' + err.message };
    }
  },

  resetAllToDefaults: () => {
    localStoreManager.saveMenuItems(INITIAL_MENU);
    localStoreManager.saveVisits(INITIAL_VISITS);
    localStoreManager.saveBookings(INITIAL_BOOKINGS);
    localStoreManager.saveLoyaltyOffers(INITIAL_LOYALTY_OFFERS);
    localStoreManager.setCurrentCustomer({
      id: 'cust_sai',
      name: 'Sai',
      email: 'sai@example.com',
      phone: '9876543210'
    });
    // Reset loyalty engine collections to fresh states
    localStorage.removeItem('dd_loyalty_claims');
    localStorage.removeItem('dd_loyalty_rewards');
    localStorage.removeItem('dd_loyalty_coupons');
    localStorage.removeItem('dd_loyalty_accounts');
    localStorage.removeItem('dd_loyalty_config');
    return true;
  },

  // No-op compatibility sync helper (safe if invoked)
  syncWithSupabase: async () => {
    // Supabase is completely disconnected. Everything runs 100% locally.
    return Promise.resolve();
  }
};

// Aliased export for seamless backwards-compatibility across the app
export const dataStore = localStoreManager;
export default localStoreManager;



