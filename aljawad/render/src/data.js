/* Al Jawad menu data. Names, descriptions and prices are from their official Al Jawad Kinshasa menu
   (menu.omegasoftware.ca/aljawadkinshasa, USD); no Lebanese price list is public, so prices are shown as samples.
   Photos are that menu's studio shots. Arabic names and descriptions are written the way Lebanese menus write them.
   Option groups only offer what the menu itself lists (dips, sides, piece counts, red or white tawook) plus free
   kitchen requests. A choice is [id, English, price delta, Arabic]. */
var OPT = {
  sauceSand: { id: 'sauce', label: 'Sauce', ar: 'الصلصة', type: 'one', choices: [['garlic', 'Garlic sauce', 0, 'ثوم'], ['tarator', 'Tarator', 0, 'طرطور'], ['both', 'Both', 0, 'الاتنين']] },
  reqSand: { id: 'req', label: 'Requests', ar: 'طلبات', type: 'many', choices: [['spicy', 'Make it spicy', 0, 'حرّ'], ['pickles', 'Extra pickles', 0, 'كبيس زيادة'], ['fries', 'Fries inside', 0, 'بطاطا جوّا'], ['noonion', 'No onion', 0, 'بلا بصل']] },
  dips: { id: 'dips', label: 'Dips', ar: 'صلصات', type: 'many', choices: [['garlic', 'Garlic dip', 0, 'ثوم'], ['spicy', 'Spicy dip', 0, 'حرّ'], ['tarator', 'Tarator', 0, 'طرطور']] },
  sides: { id: 'sides', label: 'Add a side', ar: 'زيد عالجنب', type: 'many', choices: [['fries', 'Fries', 5, 'بطاطا'], ['hummus', 'Hummus', 8, 'حمّص'], ['fattoush', 'Fattoush', 12, 'فتّوش'], ['veg', 'Vegetables plate', 5, 'صحن خضرة']] },
  dressing: { id: 'req', label: 'Requests', ar: 'طلبات', type: 'many', choices: [['side', 'Dressing on the side', 0, 'الصلصة عالجنب'], ['nobread', 'No crispy bread', 0, 'بلا خبز محمّص']] },
  reqSw: { id: 'req', label: 'Requests', ar: 'طلبات', type: 'many', choices: [['spicy', 'Make it spicy', 0, 'حرّ'], ['pickles', 'Extra pickles', 0, 'كبيس زيادة'], ['notomato', 'No tomato', 0, 'بلا بندورة'], ['half', 'Cut in half', 0, 'مقسوم نصّين']] },
  style: { id: 'style', label: 'Style', ar: 'النوع', type: 'one', choices: [['classic', 'Classic', 0, 'عادي'], ['spicy', 'Spicy', 0, 'حار']] },
  bread: { id: 'req', label: 'Requests', ar: 'طلبات', type: 'many', choices: [['bread', 'Extra bread', 0, 'خبز زيادة'], ['oil', 'Extra olive oil', 0, 'زيت زيتون زيادة']] }
};
var CATS = [
 { id: 'shawarma', name: 'Shawarma', ar: 'شاورما', quote: ['منشن رفيقك وعجقوها سوا', 'Tag your friend and dig in together.'], items: [
  { id: 'sh-chicken-sand', name: 'Chicken shawarma sandwich', ar: 'سندويش شاورما دجاج', price: 5, pack: 'wrap', desc: 'Chicken shawarma with garlic sauce, fries and pickles.', dar: 'شاورما دجاج مع ثوم وبطاطا وكبيس.', opts: ['sauceSand', 'reqSand'], pop: 1 },
  { id: 'sh-beef-sand', name: 'Beef shawarma sandwich', ar: 'سندويش شاورما لحمة', price: 5, pack: 'wrap', desc: 'Beef shawarma with tarator, tomato, pickles and bewaz salad.', dar: 'شاورما لحمة مع طرطور وبندورة وكبيس وسلطة بيواز.', opts: ['sauceSand', 'reqSand'], def: { sauce: 'tarator' } },
  { id: 'sh-chicken-markouk', name: 'Chicken shawarma markouk', ar: 'مرقوق شاورما دجاج', price: 13, pack: 'tray', desc: 'Chicken shawarma wrapped in markouk, with garlic sauce, fries, tomato, lettuce and pickles on the side.', dar: 'شاورما دجاج ملفوفة بخبز المرقوق، مع ثوم وبطاطا وبندورة وخس وكبيس عالجنب.', opts: ['dips', 'sides'] },
  { id: 'sh-beef-markouk', name: 'Beef shawarma markouk', ar: 'مرقوق شاورما لحمة', price: 14, pack: 'tray', desc: 'Beef shawarma wrapped in markouk, with fries, tomato, lettuce, pickles and tarator on the side.', dar: 'شاورما لحمة ملفوفة بخبز المرقوق، مع بطاطا وبندورة وخس وكبيس وطرطور عالجنب.', opts: ['dips', 'sides'] },
  { id: 'sh-chicken-plate', name: 'Chicken shawarma plate', ar: 'صحن شاورما دجاج', price: 16, pack: 'tray', desc: 'Chicken shawarma as a plate, with garlic sauce, fries, tomato, lettuce and pickles on the side.', dar: 'صحن شاورما دجاج مع ثوم وبطاطا وبندورة وخس وكبيس عالجنب.', opts: ['dips', 'sides'], pop: 1 },
  { id: 'sh-beef-plate', name: 'Beef shawarma plate', ar: 'صحن شاورما لحمة', price: 17, pack: 'tray', desc: 'Beef shawarma as a plate, with fries, tomato, lettuce, pickles and tarator on the side.', dar: 'صحن شاورما لحمة مع بطاطا وبندورة وخس وكبيس وطرطور عالجنب.', opts: ['dips', 'sides'] },
  { id: 'sh-mix-plate', name: 'Mix shawarma plate', ar: 'صحن شاورما مشكّل', price: 17, pack: 'tray', desc: 'Chicken and beef shawarma as a plate, with garlic sauce, fries, tomato, pickles and tarator on the side.', dar: 'شاورما دجاج ولحمة بصحن واحد، مع ثوم وبطاطا وبندورة وكبيس وطرطور عالجنب.', opts: ['dips', 'sides'] }
 ] },
 { id: 'grill', name: 'Grill', ar: 'مشاوي', quote: null, items: [
  { id: 'gr-chicken', name: 'Chicken on charcoal', ar: 'فرّوج عالفحم', price: 28, pack: 'tray', desc: 'Grilled chicken with garlic dip, spicy dip, markouk bread, pickles and fries.', dar: 'فرّوج مشوي عالفحم مع ثوم وحرّ وخبز مرقوق وكبيس وبطاطا.', opts: [{ id: 'size', label: 'Size', ar: 'الحجم', type: 'one', choices: [['whole', 'Whole chicken', 0, 'فرّوج كامل'], ['half', 'Half chicken', -14, 'نصّ فرّوج']] }, 'sides'], pop: 1 },
  { id: 'gr-mix', name: 'Mix grill', ar: 'مشاوي مشكّلة', price: 25, pack: 'tray', desc: 'Meat, kafta, red tawook and white tawook skewers, bewaz salad, grilled tomato, onion, green chili and fries.', dar: 'سيخ لحمة وسيخ كفتة وسيخ طاووق أحمر وسيخ طاووق أبيض، مع بيواز وبندورة وبصل وحرّ مشوي وبطاطا.', opts: ['dips', 'sides'], pop: 1 },
  { id: 'gr-kafta', name: 'Kafta', ar: 'كفتة مشوية', price: 20, pack: 'tray', desc: 'Three kafta skewers with bewaz salad and fries.', dar: 'تلات أسياخ كفتة مع بيواز وبطاطا.', opts: ['dips', 'sides'] },
  { id: 'gr-tawouk', name: 'Tawook', ar: 'شيش طاووق', price: 20, pack: 'tray', desc: 'Three tawook skewers with bewaz salad and fries.', dar: 'تلات أسياخ طاووق مع بيواز وبطاطا.', opts: [{ id: 'kind', label: 'Tawook', ar: 'الطاووق', type: 'one', choices: [['red', 'Red', 0, 'أحمر'], ['white', 'White', 0, 'أبيض']] }, 'dips', 'sides'] },
  { id: 'gr-beef', name: 'Grilled beef', ar: 'لحمة مشوية', price: 23, pack: 'tray', desc: 'Three beef skewers with bewaz salad, grilled tomato, onion, green chili and fries.', dar: 'تلات أسياخ لحمة مع بيواز وبندورة وبصل وحرّ مشوي وبطاطا.', opts: ['dips', 'sides'] },
  { id: 'gr-arayes', name: 'Arayes kafta', ar: 'عرايس كفتة', price: 12, pack: 'tray', desc: 'Grilled pita bread stuffed with kafta.', dar: 'خبز عربي محشي كفتة ومشوي.', opts: ['dips'] },
  { id: 'gr-lamb', name: 'Lamb chops', ar: 'كستليتا غنم', price: 31, pack: 'tray', desc: 'Lamb chops with onion, lemon, bewaz, antakli spicy bread, olive oil and sumac.', dar: 'كستليتا غنم مع بصل وحامض وبيواز وخبز أنطاكي حار وزيت زيتون وسمّاق.', opts: ['sides'] },
  { id: 'gr-wings', name: 'Grilled wings', ar: 'جوانح مشوية', price: 13, pack: 'tray', desc: 'Grilled wings with bewaz salad and fries.', dar: 'جوانح مشوية مع بيواز وبطاطا.', opts: ['dips'] }
 ] },
 { id: 'broasted', name: 'Broasted', ar: 'بروستد', quote: null, items: [
  { id: 'br-broasted', img: 'br-family', name: 'Broasted meal', ar: 'وجبة بروستد', price: 10, pack: 'box', desc: 'Broasted chicken with fries, garlic, pickles and coleslaw.', dar: 'دجاج بروستد مع بطاطا وثوم وكبيس وكول سلو.', opts: [{ id: 'pcs', label: 'Pieces', ar: 'عدد القطع', type: 'one', choices: [['2', '2 pieces', 0, 'قطعتين'], ['3', '3 pieces', 4, '3 قطع'], ['4', '4 pieces', 8, '4 قطع'], ['whole', 'Whole chicken', 37, 'فرّوج كامل']] }, 'style'], pop: 1 },
  { id: 'br-crispy', img: 'br-family-spicy', name: 'Crispy meal', ar: 'وجبة كريسبي', price: 9, pack: 'box', desc: 'Golden crispy chicken with fries, pickles, garlic and coleslaw.', dar: 'دجاج كريسبي ذهبي مع بطاطا وكبيس وثوم وكول سلو.', opts: [{ id: 'pcs', label: 'Pieces', ar: 'عدد القطع', type: 'one', choices: [['3', '3 pieces', 0, '3 قطع'], ['5', '5 pieces', 6, '5 قطع'], ['10', '10 pieces', 21, '10 قطع'], ['15', '15 pieces', 33, '15 قطعة']] }, 'style'] },
  { id: 'br-combo', name: 'Combo mix', ar: 'كومبو مشكّل', price: 17, pack: 'box', desc: '2 pieces of broasted and 3 pieces of crispy chicken with fries, garlic, pickles, coleslaw and a soft drink.', dar: 'قطعتين بروستد و3 قطع كريسبي مع بطاطا وثوم وكبيس وكول سلو ومشروب غازي.', opts: ['style'] },
  { id: 'br-family', name: 'Family combo', ar: 'كومبو العيلة', price: 44, pack: 'box', desc: '6 pieces of broasted and 6 pieces of crispy chicken with fries, garlic, pickles, coleslaw and a soft drink.', dar: '6 قطع بروستد و6 قطع كريسبي مع بطاطا وثوم وكبيس وكول سلو ومشروب غازي.', opts: ['style'] }
 ] },
 { id: 'mezza', name: 'Mezza', ar: 'مقبّلات', quote: ['هول بس المقبلات، كيف اذا بيشوفوا الطبق الرئيسي', 'That is only the starters. Wait till you see the main dish.'], items: [
  { id: 'mz-hummus', name: 'Hummus', ar: 'حمّص', price: 8, pack: 'bowl-y', desc: 'Blended chickpeas with tahini.', dar: 'حمّص مطحون مع طحينة.', opts: ['bread'], pop: 1 },
  { id: 'mz-hummus-meat', name: 'Hummus with meat', ar: 'حمّص باللحمة', price: 12, pack: 'bowl-y', desc: 'Hummus topped with minced beef fillet and roasted nuts.', dar: 'حمّص مع فيليه لحمة مفروم ومكسّرات محمّصة.', opts: ['bread'], pop: 1 },
  { id: 'mz-moutabal', name: 'Moutabal', ar: 'متبّل', price: 8, pack: 'bowl-y', desc: 'Smoky roasted eggplant blended with tahini and pomegranate.', dar: 'باذنجان مشوي مدخّن مع طحينة ورمّان.', opts: ['bread'] },
  { id: 'mz-warak', name: 'Warak enab', ar: 'ورق عنب', price: 10, pack: 'bowl-y', desc: 'Grape leaves stuffed with rice, herbs and spices.', dar: 'ورق عنب محشي رز وخضرة وبهارات.', opts: [] },
  { id: 'mz-mouhammara', name: 'Mouhammara', ar: 'محمّرة', price: 8, pack: 'bowl-y', desc: 'Walnuts, pomegranate molasses, sweet and hot pepper, cumin and olive oil.', dar: 'جوز ودبس رمّان وفليفلة حلوة وحارّة وكمّون وزيت زيتون.', opts: ['bread'] },
  { id: 'mz-kibbeh-nayyeh', name: 'Kibbeh nayyeh', ar: 'كبّة نيّة', price: 12, pack: 'bowl-y', desc: 'Raw kibbeh with the kibbeh spice mix, radish, onion, mint and green onion.', dar: 'كبّة نيّة مع خلطة الكبّة وفجل وبصل ونعنع وبصل أخضر.', opts: ['bread'] },
  { id: 'mz-fatteh', name: 'Fatteh hummus', ar: 'فتّة حمّص', price: 10, pack: 'bowl-y', desc: 'Chickpeas, crispy bread, warm yogurt and mixed nuts.', dar: 'حمّص حب وخبز محمّص ولبن سخن ومكسّرات.', opts: [] },
  { id: 'mz-fatteh-meat', name: 'Meat fatteh', ar: 'فتّة لحمة', price: 12, pack: 'bowl-y', desc: 'Chickpeas, minced beef, crispy bread, warm yogurt and mixed nuts.', dar: 'حمّص حب ولحمة مفرومة وخبز محمّص ولبن سخن ومكسّرات.', opts: [] },
  { id: 'mz-kibbeh-laban', name: 'Kibbeh with yogurt', ar: 'كبّة بلبنيّة', price: 12, pack: 'bowl-y', desc: 'Kibbeh in a creamy yogurt sauce, topped with toasted nuts.', dar: 'كبّة بصلصة لبن كريميّة مع مكسّرات محمّصة.', opts: [] },
  { id: 'mz-pastries', name: 'Mix pastries', ar: 'معجّنات مشكّلة', price: 12, pack: 'bowl-y', desc: '2 beef sambousek, 2 kibbeh and 2 cheese rolls.', dar: 'قطعتين سمبوسك لحمة وقطعتين كبّة وقطعتين رقاقات جبنة.', opts: [] },
  { id: 'mz-rakakat', name: 'Cheese rolls', ar: 'رقاقات جبنة', price: 10, pack: 'bowl-y', desc: '5 crispy pastry rolls filled with melted cheese.', dar: '5 رقاقات مقرمشة محشية جبنة ذايبة.', opts: [] },
  { id: 'mz-sambousek', name: 'Meat sambousek', ar: 'سمبوسك لحمة', price: 10, pack: 'bowl-y', desc: '5 crispy pastry pockets filled with seasoned minced beef.', dar: '5 قطع سمبوسك مقرمش محشي لحمة مفرومة متبّلة.', opts: [] },
  { id: 'mz-makanek', name: 'Makanek', ar: 'مقانق', price: 12, pack: 'bowl-y', desc: 'Makanek with lemon, butter and pomegranate molasses.', dar: 'مقانق مع حامض وزبدة ودبس رمّان.', opts: [] },
  { id: 'mz-sujuk', name: 'Sujuk', ar: 'سجق', price: 12, pack: 'bowl-y', desc: 'Sujuk with lemon, cherry tomato and bell peppers.', dar: 'سجق مع حامض وبندورة كرزيّة وفليفلة ملوّنة.', opts: [] },
  { id: 'mz-fries', name: 'Fries', ar: 'بطاطا مقلية', price: 5, pack: 'bowl-y', desc: 'A plate of fries.', dar: 'صحن بطاطا مقلية.', opts: [] }
 ] },
 { id: 'salads', name: 'Salads', ar: 'سلطات', quote: ['حتّى بالسلطة، مدلعينك', 'Even with salad, we spoil you.'], items: [
  { id: 'sa-fattoush', name: 'Fattoush', ar: 'فتّوش', price: 12, pack: 'bowl-m', desc: 'Lettuce, cucumber, tomato, radish, garlic, olive oil, lemon and markouk bread.', dar: 'خس وخيار وبندورة وفجل وتوم وزيت زيتون وحامض وخبز مرقوق.', opts: ['dressing'], pop: 1 },
  { id: 'sa-tabbouleh', name: 'Tabbouleh', ar: 'تبّولة', price: 10, pack: 'bowl-m', desc: 'Chopped parsley, tomato, onion and bulgur with a lemon and oil dressing.', dar: 'بقدونس مفروم وبندورة وبصل وبرغل مع حامض وزيت.', opts: ['dressing'] },
  { id: 'sa-caesar', name: 'Caesar salad', ar: 'سلطة سيزر', price: 18, pack: 'bowl-m', desc: 'Grilled chicken, cherry tomato, mushroom, parmesan, croutons, walnuts and Caesar dressing.', dar: 'دجاج مشوي وبندورة كرزيّة وفطر وبارميزان وخبز محمّص وجوز وصلصة سيزر.', opts: ['dressing'] },
  { id: 'sa-quinoa', name: 'Chicken quinoa salad', ar: 'سلطة كينوا بالدجاج', price: 22, pack: 'bowl-m', desc: 'Kale, cherry tomato, beetroot, quinoa, peanuts, walnuts, pomegranate, chicken breast, peanut and teriyaki sauce.', dar: 'كايل وبندورة كرزيّة وشمندر وكينوا وفستق عبيد وجوز ورمّان وصدر دجاج وصلصة فستق وترياكي.', opts: ['dressing'] },
  { id: 'sa-rocca', name: 'Rocca salad', ar: 'سلطة روكا', price: 14, pack: 'bowl-m', desc: 'Rocca, tomato, onion and sumac with a lemon mustard dressing.', dar: 'روكا وبندورة وبصل وسمّاق مع صلصة حامض وخردل.', opts: ['dressing'] },
  { id: 'sa-parmigiano', name: 'Rocca parmigiano', ar: 'روكا بارميزان', price: 18, pack: 'bowl-m', desc: 'Rocca, parmesan, cherry tomato, walnut and mushroom with balsamic.', dar: 'روكا وبارميزان وبندورة كرزيّة وجوز وفطر مع بلسميك.', opts: ['dressing'] },
  { id: 'sa-veg', name: 'Vegetables plate', ar: 'صحن خضرة', price: 5, pack: 'bowl-m', desc: 'Mint, tomato, onion, green chili, radish and green onion.', dar: 'نعنع وبندورة وبصل وحرّ أخضر وفجل وبصل أخضر.', opts: [] }
 ] },
 { id: 'sandwiches', name: 'Sandwiches', ar: 'سندويشات', quote: null, items: [
  { id: 'sw-hawsa', name: 'Hawsa sandwich', ar: 'سندويش حوسة', price: 12, pack: 'wrap', desc: 'Hawsa meat with rocca, onion, tomato and mayonnaise.', dar: 'لحمة حوسة مع روكا وبصل وبندورة ومايونيز.', opts: ['reqSw'] },
  { id: 'sw-burger', name: 'Lebanese burger', ar: 'برغر لبناني', price: 10, pack: 'box', desc: 'Beef patty with ketchup, coleslaw and fries.', dar: 'برغر لحمة مع كاتشب وكول سلو وبطاطا.', opts: ['reqSw'] },
  { id: 'sw-crispy', name: 'Crispy sandwich', ar: 'سندويش كريسبي', price: 9, pack: 'wrap', desc: 'Crispy chicken with coleslaw, fries and ketchup, regular or spicy.', dar: 'دجاج كريسبي مع كول سلو وبطاطا وكاتشب، عادي أو حار.', opts: ['reqSw'] },
  { id: 'sw-twister', name: 'Twister', ar: 'تويستر', price: 9, pack: 'wrap', desc: 'Crispy chicken, iceberg, twister sauce and cheddar sauce in tortilla bread.', dar: 'دجاج كريسبي وخس وصلصة تويستر وصلصة شيدر بخبز التورتيلا.', opts: ['reqSw'] },
  { id: 'sw-fajita', name: 'Fajita', ar: 'فاهيتا', price: 11, pack: 'wrap', desc: 'Chicken in fajita sauce with green pepper, onion, mushroom, avocado sauce and mozzarella.', dar: 'دجاج بصلصة الفاهيتا مع فليفلة خضرا وبصل وفطر وصلصة أفوكادو وموزاريلا.', opts: ['reqSw'] }
 ] }
];
