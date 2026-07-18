/* Super Sean 007 — main quest chain, side quests, gems and NPC dialogue. */
(() => {
  'use strict';
  window.SSG = window.SSG || {};

  // Main chain. Each quest: trigger describes what advances it.
  // trigger types: talk {npc}, defeatKind {kind, count}, defeat {monsterId},
  // claim, blueprint {blueprintId}, craft {recipeId}, collect {item, count}, recruit {char}
  SSG.MAIN_QUESTS = [
    {id:'awakening', title:'The Birthday Crystal',
      objective:'Talk to Elder Brightbeard in Birthday Village.',
      trigger:{type:'talk', npc:'elder'}},
    {id:'find_dave', title:'Gather the First Friend',
      objective:'Talk to Dave near the Birthday path.',
      trigger:{type:'talk', npc:'dave'},
      onDone:{party:'dave', items:{'Berry Juice':2}}},
    {id:'meadow_entry', title:'The Meadow Road',
      objective:'Travel east and defeat 3 Slime Sprouts in Mushroom Meadow.',
      trigger:{type:'defeatKind', kind:'slime', count:3}},
    {id:'moldor', title:'The Mushroom Grump',
      objective:'Find and defeat Moldor in the northeast meadow.',
      trigger:{type:'defeat', monster:'moldor'},
      onDone:{unlock:'homestead', gem:'Meadow Gem', friendship:25}},
    {id:'homestead_claim', title:'A Place To Call Home',
      objective:'Elder Brightbeard granted you a land deed! Take the south path from the village and touch the Homestead Crystal.',
      trigger:{type:'claim'}},
    {id:'home_foundation', title:'Raise the Roof',
      objective:'Gather wood and stone, open Build mode (B) at the Homestead and stamp a Cozy Cottage blueprint (V).',
      trigger:{type:'blueprint', blueprint:'cottage'},
      onDone:{unlock:'cave', items:{'Berry Seed':3}, coins:50}},
    {id:'crystal_cave', title:'Echoes in Crystal Cave',
      objective:'Enter Crystal Cave north of the village and calm the Cracked Crystal Guardian.',
      trigger:{type:'defeat', monster:'guardian'},
      onDone:{unlock:'petro', gem:'Cave Gem', friendship:25}},
    {id:'petro_parts', title:'The Sleeping Machines',
      objective:'Petroman waits in Petro Plains to the west. Bring him 3 Gear Parts from the scrap machines.',
      trigger:{type:'collect', item:'Gear Part', count:3, npc:'petroman'},
      onDone:{recruit:'petroman'}},
    {id:'petro_titan', title:'Heart of the Plains',
      objective:'With Petroman at your side, defeat the Petro Titan in the deep plains.',
      trigger:{type:'defeat', monster:'petro_titan'},
      onDone:{unlock:'ruushwood', gem:'Plains Gem'}},
    {id:'ruush_trail', title:'Arrows in the Leaves',
      objective:'Find Ruush in Ruushwood, east of the meadow, and defeat the Elder Treeguard together.',
      trigger:{type:'defeat', monster:'treeguard'},
      onDone:{recruit:'ruush', unlock:'moon', gem:'Forest Gem'}},
    {id:'moon_tea', title:'Tea Under Two Moons',
      objective:'Haraku guards the Moon Shrine north of Ruushwood. Brew Moon Tea in your Homestead kitchen and bring it to her.',
      trigger:{type:'collect', item:'Moon Tea', count:1, npc:'haraku'},
      onDone:{recruit:'haraku'}},
    {id:'lunar_shade', title:'The Lunar Shade',
      objective:'Banish the Lunar Shade haunting the Moon Shrine.',
      trigger:{type:'defeat', monster:'lunar_shade'},
      onDone:{unlock:'ruins', gem:'Moon Gem'}},
    {id:'ruins_seal', title:'The Broken Seal',
      objective:'Recover 3 Ancient Relics in the Ancient Ruins, then defeat Guardian Prime.',
      trigger:{type:'defeat', monster:'guardian_prime'},
      onDone:{unlock:'tower', gem:'Ruin Gem'}},
    {id:'tower', title:'The Bald Moon Rises',
      objective:'Climb Bald Moon Tower and face Xelar\'s Echo.',
      trigger:{type:'defeat', monster:'xelar_echo'}},
    {id:'xelar_final', title:'Xelar the Bald Wizard',
      objective:'Xelar himself descends! Defeat him at the tower peak and restore the Seventh Gem.',
      trigger:{type:'defeat', monster:'xelar_final'},
      onDone:{gem:'Seventh Gem', unlock:'frostpeak'}},
    {id:'postgame_frostpeak', title:'Winter Beyond the Tower',
      objective:'Cross into Frostpeak Reaches and defeat 2 winged fiends haunting the frozen road.',
      trigger:{type:'defeatKind', kind:'bat', count:2},
      onDone:{coins:180, items:{'Moon Tea':2}}},
    {id:'frostpeak_queen', title:'Queen of the Empty Winter',
      objective:'Reach the far ridge and defeat the Void Succubus Queen.',
      trigger:{type:'defeat', monster:'fp_boss'},
      onDone:{unlock:'sunsand', coins:300, items:{'Crystal Candy':3}}},
    {id:'sunsand_scout', title:'Footprints in Sunsand',
      objective:'Explore Sunsand Isle and defeat 2 cursed shore creatures before the tide rises.',
      trigger:{type:'defeatKind', kind:'mushroom', count:2},
      onDone:{coins:220, items:{'Ancient Relic':2}}},
    {id:'tide_sovereign', title:'The Last Tide',
      objective:'Defeat the Tide Spirit Sovereign and free the distant shore from Xelar\'s remaining corruption.',
      trigger:{type:'defeat', monster:'ss_boss'},
      onDone:{coins:500, friendship:40, items:{'Relic Crown':1, 'Moonfruit Seed':3}}},
    {id:'postgame_legend', title:'Legend of Asteria-007',
      objective:'The world is safe. Build the greatest homestead in Asteria, complete side quests, or begin New Game+ at the Homestead Crystal.',
      trigger:{type:'none'}}
  ];

  SSG.GEMS = ['Meadow Gem', 'Cave Gem', 'Plains Gem', 'Forest Gem', 'Moon Gem', 'Ruin Gem', 'Seventh Gem'];

  // Distinct sliced gem icons (data/icon-manifest.json), one per gem.
  SSG.GEM_ICONS = {
    'Meadow Gem': 'icon_gem_green',
    'Cave Gem': 'icon_gem_blue',
    'Plains Gem': 'icon_gem_red',
    'Forest Gem': 'icon_gem_purple',
    'Moon Gem': 'icon_pearl',
    'Ruin Gem': 'icon_star_gold',
    'Seventh Gem': 'icon_gem_rainbow'
  };

  // Side quests: give item counts to an NPC for a reward. Repeatable ones re-arm.
  SSG.SIDE_QUESTS = [
    {id:'soup', npc:'berrybun', title:'Grandma\'s Soup Pot',
      ask:{item:'Mushroom Cap', count:5},
      reward:{coins:40, items:{'Mushroom Stew':1}},
      lines:['My soup pot is empty! Bring me 5 Mushroom Caps from the meadow?','Bless you! Here, a bowl of stew and some coins.']},
    {id:'spareparts', npc:'dave_home', title:'Dave\'s Spare Parts',
      ask:{item:'Gear Part', count:3},
      reward:{items:{'Gadget Charm':1}},
      lines:['I could build you something great with 3 spare Gear Parts...','Ta-da! One Gadget Charm. Wear it proudly.']},
    {id:'berryrun', npc:'bobo', title:'Bobo\'s Berry Run', repeatable:true,
      ask:{item:'Berry', count:8},
      reward:{coins:35, items:{'Flower Seed':2}},
      lines:['Bobo pays top coin for 8 fresh berries. Deal?','Juicy! Coins and seeds, as promised. Come back anytime.']},
    {id:'gardenpride', npc:'elder', title:'Village Garden Pride',
      ask:{comfort:60},
      reward:{coins:120, items:{'Moonfruit Seed':2}},
      lines:['Build a homestead with 60 Comfort and the whole village will visit!','Magnificent! Your home honors the old Guardians.']},
    {id:'castledream', npc:'elder', title:'A Castle for Asteria',
      ask:{blueprint:'keep'},
      reward:{coins:200, items:{'Crystal Candy':3}},
      lines:['Legends say a hero once raised a stone keep here. Could you?','A true castle! Xelar will think twice now.']}
  ];

  // Achievements: checked event-driven by systems.checkAchievements().
  // badge: distinct sliced icon from data/icon-manifest.json.
  SSG.ACHIEVEMENTS = [
    {id:'first_win',      label:'First Victory',       desc:'Win your first battle.',                       badge:'badge_5'},
    {id:'gem_1',          label:'Gem Bearer',          desc:'Restore your first Gem.',                      badge:'icon_gem_blue'},
    {id:'home_claimed',   label:'Landowner',           desc:'Claim the Sunrise Homestead.',                 badge:'marker_home'},
    {id:'first_blueprint',label:'Master Builder',      desc:'Stamp your first blueprint.',                  badge:'badge_3'},
    {id:'castle',         label:'Castle Dreamer',      desc:'Build the Stone Keep.',                        badge:'marker_castle'},
    {id:'comfort_100',    label:'Cozy Legend',         desc:'Reach 100 Comfort.',                           badge:'heart_spark'},
    {id:'first_crop',     label:'Green Thumb',         desc:'Harvest your first crop.',                     badge:'icon_herb'},
    {id:'first_fish',     label:'Gone Fishing',        desc:'Catch a Sunfish.',                             badge:'icon_water'},
    {id:'first_treasure', label:'X Marks the Spot',    desc:'Dig up a buried treasure.',                    badge:'chest_gold'},
    {id:'daily_done',     label:'Helping Hand',        desc:'Complete a quest board request.',              badge:'badge_6'},
    {id:'full_party',     label:'Friendship Five',     desc:'Recruit every friend.',                        badge:'badge_11'},
    {id:'level_10',       label:'Seasoned Hero',       desc:'Reach level 10.',                              badge:'badge_4'},
    {id:'gather_50',      label:'Forager',             desc:'Harvest 50 materials from nodes.',             badge:'icon_leaf'},
    {id:'xelar_down',     label:'Bald No More',        desc:'Defeat Xelar the Bald Wizard.',                badge:'badge_1'},
    {id:'all_gems',       label:'Legend of the Seven', desc:'Restore all Seven Gems.',                      badge:'icon_gem_rainbow'},
    {id:'frostpeak_clear',label:'Winter Breaker',      desc:'Defeat the Void Succubus Queen.',              badge:'icon_snowflake'},
    {id:'sunsand_clear',  label:'Tide Turner',         desc:'Defeat the Tide Spirit Sovereign.',            badge:'icon_water'},
    {id:'postgame_clear', label:'Beyond the Seven',    desc:'Complete the Frostpeak and Sunsand epilogue.', badge:'badge_10'},
    {id:'ng_plus',        label:'Rebirth of Legends',  desc:'Begin New Game+.',                             badge:'badge_12'},
    {id:'chest_hunter',   label:'Chest Hunter',        desc:'Open 5 treasure chests.',                      badge:'badge_2'},
    {id:'coin_500',       label:'Coin Collector',      desc:'Hold 500 coins at once.',                      badge:'badge_7'},
    {id:'battles_25',     label:'Battle Veteran',      desc:'Win 25 battles.',                              badge:'badge_8'},
    {id:'locksmith',      label:'Locksmith',           desc:'Open a sealed chest with an Old Key.',         badge:'badge_9'},
    {id:'completionist',  label:'Living Legend',       desc:'Earn every other achievement.',                badge:'icon_trophy'}
  ];

  SSG.NPC_LINES = {
    cook_nadia: ['Smell that? Mushroom stew, hero-sized portions!', 'Bring me fresh caps and I\'ll teach you a recipe someday.'],
    innkeeper_rosie: ['Welcome to the Hero\'s Rest! A bed and a bowl of stew works wonders.'],
    archivist_lyra: [
      'Shh — the books are sleeping. Welcome to the Elder\'s Hall.',
      'Long before Xelar, the Seven Gems chose seven guardians. Their stories live on these shelves.',
      'That keepsake chest? Elder Brightbeard said a true hero may open it.'
    ],
    teacher_opal: ['Study your maps, Sean — every region hides a lesson.', 'The Seven Gems were a school project once. True story!'],
    bard_lio: ['♪ Sean, Sean, the gem-bright hero… ♪ still working on the rhyme.', 'A song for the road? On the house, for a friend of the village.'],
    animal_deer: ['The deerling blinks up at you and nuzzles your hand. ✿'],
    animal_turtle: ['The turtle slowly, contentedly, chews a leaf. All is well.'],
    animal_goat: ['The sky goat bleats and its little wings give a hopeful flap!'],
    elder: [
      'Sean, the Village Crystal has dimmed. Xelar the Bald Wizard is draining the Seven Gems.',
      'Your crystal sword awoke the old Guardian promise. Gather friends, gather courage.',
      'When the meadow is safe, I will grant you the old homestead deed south of the village.'
    ],
    dave: [
      'Finally! I packed snacks, gadgets and exactly one emergency slingshot.',
      'I will mark treasure on your map. Also I borrowed two Berry Juices. Probably legally.'
    ],
    dave_home: [
      'Your homestead is awesome! I set up a tinkering corner by the fence.',
      'Bring me spare parts and I will build us something shiny.'
    ],
    berrybun: [
      'A hero needs cake and soup. My pot is always warm for you, dear.',
      'Plant berries at your homestead — nothing beats homegrown!'
    ],
    bobo: [
      'Bobo sees all roads, sells all snacks. Browse my wares!',
      'Rumor says every region hides materials no coin can buy. Bobo still tries.'
    ],
    petroman: [
      'These plains were alive with friendly machines before Xelar came.',
      'Bring me 3 Gear Parts and I will restart the old generator — then I fight beside you.'
    ],
    ruush: [
      'Shh. The Treeguard is angry, not evil. Xelar\'s shadow twists it.',
      'Fight beside me and aim true. The forest remembers its friends.'
    ],
    haraku: [
      'The shrine\'s starlight is fading. A shade wears its glow like a stolen cloak.',
      'Share a cup of Moon Tea with me, and I will walk your path.'
    ],
    mila: [
      'I saw fireflies dancing over your homestead last night. So pretty!',
      'The pond fish say hello. I speak fish. A little.'
    ],
    pip: [
      'When I grow up I want a castle with nine spires and a mushroom moat!',
      'Race you to the fountain! ...Later. After snacks.'
    ],
    farmer_gil: [
      'These fields feed the whole valley. Rain\'s been kind this season.',
      'Build some Tilled Soil at your homestead — nothing beats homegrown berries!'
    ],
    baker_tom: [
      'Grandma Berrybun\'s teaching me the seven-gem sponge cake. It\'s... structurally ambitious.',
      'Bring mushrooms and I\'ll trade you a fresh loaf someday. Someday.'
    ],
    timmy: [
      'Did you really fight a bald wizard? Was he SHINY?',
      'I found a shortcut behind the pond. Probably. I got a bit lost.'
    ]
  };
})();
