/* ===== characterBookGameStatusFilter ===== */
(() => {
  const visibleStatuses = new Set(['已全通', '进行中']);
  const values = source => (Array.isArray(source) ? source : [source])
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
    .map(value => String(value));
  const characterGameIds = character => values([character?.gameId, ...(Array.isArray(character?.gameIds) ? character.gameIds : [])]);
  const characterSubjectIds = character => values([character?.bangumiSubjectId, character?.bangumiId, ...(Array.isArray(character?.bangumiSubjectIds) ? character.bangumiSubjectIds : [])]);
  const linkedGame = (character, gameRows = []) => {
    const rows = Array.isArray(gameRows) ? gameRows : [];
    const gameIds = new Set(characterGameIds(character));
    const subjectIds = new Set(characterSubjectIds(character));
    const directMatches = rows.filter(game => gameIds.has(String(game?.id ?? '')));
    const subjectMatches = rows.filter(game => {
      const ids = [game?.bangumiId, game?.bangumiDisplayId, game?.subjectId]
        .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
        .map(String);
      return ids.some(id => subjectIds.has(id));
    });
    const matches = [...new Set([...directMatches, ...subjectMatches])];
    return matches.find(game => visibleStatuses.has(String(game?.status || '').trim())) || matches[0] || null;
  };
  const isVisible = (character, gameRows = []) => !characterGameIds(character).length || visibleStatuses.has(String(linkedGame(character, gameRows)?.status || '').trim());
  const filter = (characters, gameRows = []) => (Array.isArray(characters) ? characters : []).filter(character => isVisible(character, gameRows));
  window.AmoristCharacterBookVisibility = {visibleStatuses, linkedGame, isVisible, filter};
})();
;

/* ===== amoristMobileResponsiveScriptV23 ===== */
(() => {
  const mobileQuery = window.matchMedia('(max-width: 900px)');
  const root = document.documentElement;

  const syncViewport = () => {
    root.style.setProperty('--amorist-mobile-vh', `${window.innerHeight * 0.01}px`);
    root.classList.toggle('amorist-mobile', mobileQuery.matches);
  };

  const ensureProfileSwitcher = () => {
    const layout = document.querySelector('.profile-layout');
    if (!layout || document.querySelector('.mobile-profile-switch')) return;
    const switcher = document.createElement('div');
    switcher.className = 'mobile-profile-switch';
    switcher.setAttribute('role', 'tablist');
    switcher.setAttribute('aria-label', '自介页面移动端视图');
    switcher.innerHTML = `
      <button type="button" class="active" data-profile-mobile-pane="preview" role="tab" aria-selected="true">预览名片</button>
      <button type="button" data-profile-mobile-pane="edit" role="tab" aria-selected="false">编辑资料</button>`;
    layout.before(switcher);
    layout.dataset.mobilePane = 'preview';
    switcher.addEventListener('click', event => {
      const button = event.target.closest('[data-profile-mobile-pane]');
      if (!button) return;
      const pane = button.dataset.profileMobilePane;
      layout.dataset.mobilePane = pane;
      switcher.querySelectorAll('button').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      if (mobileQuery.matches) switcher.scrollIntoView({block:'start', behavior:'smooth'});
    });
  };

  document.addEventListener('click', event => {
    if (!mobileQuery.matches) return;
    const chip = event.target.closest('.filter-pill,.profile-tab,.profile-page-btn');
    if (chip) requestAnimationFrame(() => chip.scrollIntoView({block:'nearest', inline:'center', behavior:'smooth'}));
  });

  window.addEventListener('resize', syncViewport, {passive:true});
  window.addEventListener('orientationchange', syncViewport, {passive:true});
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', syncViewport);
  else mobileQuery.addListener(syncViewport);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { syncViewport(); ensureProfileSwitcher(); }, {once:true});
  } else {
    syncViewport();
    ensureProfileSwitcher();
  }
})();
;

/* ===== homeOmikuji ===== */
(()=>{
  const card=document.getElementById('homeOmikujiCard');
  if(!card)return;
  const $=id=>document.getElementById(id);
  const VERSION='amorist-omikuji-v1',CHAR_KEY='amorist-character-book-v1',GAME_KEY='amorist-game-library-v1';
  const RESULT_KEY='amorist.omikuji.result';
  const read=(key)=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
  const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const hash=value=>{let result=2166136261;for(const char of String(value)){result^=char.charCodeAt(0);result=Math.imul(result,16777619)}return result>>>0};
  const localDate=()=>{const now=new Date(),pad=value=>String(value).padStart(2,'0');return {key:`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,label:`${pad(now.getMonth()+1)}.${pad(now.getDate())}`}};
  const openedKey=()=>`amorist.omikuji.opened.${localDate().key}`;
  const characterName=character=>character?.nameCn||character?.name_cn||character?.name||'';
  const titleOf=game=>game?.nameCn||game?.name||'';
  const normalizeUserCharacters=()=>{
    const games=read(GAME_KEY),gameMap=new Map(games.map(game=>[String(game.id),game]));
    const visibleCharacters=window.AmoristCharacterBookVisibility.filter(read(CHAR_KEY),games);
    return visibleCharacters.filter(character=>character?.gameId||(!character?.animeId&&!Array.isArray(character?.animeIds))).map(character=>{
      const game=gameMap.get(String(character.gameId||'')),name=characterName(character);
      const workTitle=titleOf(game)||character.workTitle||'';
      const workId=character.bangumiSubjectId||character.bangumiId||game?.bangumiId||'';
      const characterId=character.bangumiCharacterId||character.characterId||character.id||'';
      if(!name)return null;
      const key=`角色图鉴|${characterId||workTitle+'|'+name}`;
      return {key,name,workTitle,image:character.image||'',source:'角色图鉴',characterId:String(characterId||''),workId:String(workId||'')};
    }).filter(Boolean);
  };
  const normalizeBangumiCharacters=()=>{
    const rows=window.amoristBangumiDiscovery?.getList?.()||[],result=[];
    rows.forEach(game=>{
      (Array.isArray(game.chars)?game.chars:[]).forEach(character=>{
        const name=characterName(character),workTitle=titleOf(game),characterId=character.id||character.characterId||'';
        if(!name)return;
        const key=`作品索引|${characterId||String(game.id)+'|'+workTitle+'|'+name}`;
        result.push({key,name,workTitle,image:character.image||character.images?.large||character.images?.medium||'',source:'作品索引',characterId:String(characterId||''),workId:String(game.id||'')});
      });
    });
    return result;
  };
  const unique=rows=>Array.from(new Map(rows.map(row=>[row.key,row])).values()).sort((a,b)=>a.key.localeCompare(b.key));
  const grades=[['大吉',14],['中吉',20],['小吉',20],['吉',22],['末吉',14],['凶',8],['大凶',2]];
  const messages={
    '大吉':['迷わず進むこと。','拾った偶然を手放さないこと。'],
    '中吉':['急がなくても、縁は逃げない。','静かなほうを選ぶこと。'],
    '小吉':['小さな違和感を見逃さないこと。','少しだけ遠回りを。'],
    '吉':['いつもの順番を変えてみて。','言葉より、気配を信じる日。'],
    '末吉':['答えを急がないこと。','待つことにも意味がある。'],
    '凶':['今日は無理をしないこと。','静かな場所へ戻ること。'],
    '大凶':['立ち止まることも旅のうち。','今日は何も決めなくていい。']
  };
  function candidates(){return {user:unique(normalizeUserCharacters()),bangumi:unique(normalizeBangumiCharacters())}};
  function stablePick(){
    const pools=candidates(),all=unique([...pools.user,...pools.bangumi]),date=localDate().key,seed=`${date}|${all.map(row=>row.key).join(',')}|${VERSION}`;
    if(!all.length)return null;
    let pool=pools.user.length&&pools.bangumi.length?(hash(seed+'|source')%100<70?pools.user:pools.bangumi):(pools.user.length?pools.user:pools.bangumi);
    const character=pool[hash(seed+'|character')%pool.length];
    let cursor=hash(seed+'|grade')%100,total=0,grade=grades[0][0];
    for(const [name,weight] of grades){total+=weight;if(cursor<total){grade=name;break}}
    const options=messages[grade]||messages['吉'],message=options[hash(seed+'|message')%options.length];
    return {...character,grade,message,attribution:`${character.name}より`};
  }
  function setText(id,value){const node=$(id);if(node)node.textContent=value||''}
  function readDailyResult(date){
    try{
      const saved=JSON.parse(localStorage.getItem(`${RESULT_KEY}.${date}`)||'null');
      return saved&&saved.date===date&&saved.result?saved.result:null;
    }catch{return null}
  }
  function saveDailyResult(date,result){
    if(!result)return;
    try{localStorage.setItem(`${RESULT_KEY}.${date}`,JSON.stringify({date,result,hasDrawn:true}))}catch{}
  }
  // Keep the result collapsed on every page load. Drawing can reveal it for
  // the current session, while a refresh returns to the quieter sealed state.
  let dailyResult=null,isRevealed=false;
  function updateView(animate=false){
    const sealed=$('homeOmikujiSealed'),panel=$('homeOmikujiResult'),collapse=$('homeOmikujiCollapse');
    if(!dailyResult){sealed.hidden=true;panel.hidden=false;collapse.hidden=true;setText('homeOmikujiName','');setText('homeOmikujiWork','');setText('homeOmikujiGrade','');setText('homeOmikujiMessage','今日はまだ、誰も来ていません。');setText('homeOmikujiAttribution','');$('homeOmikujiOpen').hidden=true;return}
    setText('homeOmikujiName',dailyResult.name);setText('homeOmikujiWork',dailyResult.workTitle);setText('homeOmikujiGrade',dailyResult.grade);setText('homeOmikujiMessage',dailyResult.message);setText('homeOmikujiAttribution',dailyResult.attribution);$('homeOmikujiOpen').hidden=false;collapse.hidden=!isRevealed;
    const portrait=$('homeOmikujiPortrait');portrait.innerHTML=dailyResult.image?`<img src="${esc(dailyResult.image)}" alt="${esc(dailyResult.name)}" loading="lazy" referrerpolicy="no-referrer">`:esc(dailyResult.name.trim().slice(0,1)||'縁');
    sealed.hidden=isRevealed;panel.hidden=!isRevealed;
    if(animate){const active=isRevealed?panel:sealed;active.classList.remove('is-visible');active.classList.add('is-revealing');requestAnimationFrame(()=>{active.classList.remove('is-revealing');active.classList.add('is-visible')})}
  }
  function render(){
    const date=localDate();
    setText('homeOmikujiDate',date.label);
    dailyResult=readDailyResult(date.key);
    if(!dailyResult){dailyResult=stablePick();saveDailyResult(date.key,dailyResult)}
    updateView();
  }
  $('homeOmikujiDraw')?.addEventListener('click',()=>{if(!dailyResult)return;localStorage.setItem(openedKey(),'1');isRevealed=true;updateView(true)});
  $('homeOmikujiCollapse')?.addEventListener('click',()=>{isRevealed=false;updateView(true)});
  $('homeOmikujiOpen')?.addEventListener('click',()=>{
    const result=dailyResult;if(!result)return;
    if(result.source==='角色图鉴'){
      window.amoristProductNavigate?.('characters',true);
      setTimeout(()=>{if(result.characterId)window.dispatchEvent(new CustomEvent('amorist-open-character',{detail:result.characterId}))},240);
    }else{
      window.amoristProductNavigate?.('bangumi',true);
      setTimeout(()=>{window.amoristBangumiDiscovery?.show?.(result.workId);setTimeout(()=>{const node=[...document.querySelectorAll('#bangumiDbCharsGrid [data-char-id]')].find(el=>String(el.dataset.charId)===String(result.characterId));if(node){node.classList.add('omikuji-highlight');node.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>node.classList.remove('omikuji-highlight'),1600)}},420)},240);
    }
  });
  window.addEventListener('amorist-bangumi-cache-ready',render);
  window.addEventListener('amorist-data-changed',render);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
  render();
})();
;

/* ===== inline-script ===== */
(() => {
      const STAGE_W = 750;
      const STAGE_H = 1000;
      const OUTPUT_W = 1500;
      const OUTPUT_H = 2000;
      const STORAGE_KEY = 'otomeRepoMaker.v7';
      const ARCHIVE_DB_NAME = window.AMORIST_MODE === 'public' ? 'otomeRepoMakerPublicArchives' : 'otomeRepoMakerArchives';
      const ARCHIVE_STORE_NAME = 'archives';
      const IMAGE_LIBRARY_STORE_NAME = 'imageLibrary';
      const TRASH_STORE_NAME = 'trash';
      const ARCHIVE_FALLBACK_KEY = 'otomeRepoMaker.archives.v1';
      const CURRENT_ARCHIVE_KEY = 'otomeRepoMaker.currentArchiveId';
      const IMAGE_LIBRARY_FALLBACK_KEY = 'otomeRepoMaker.imageLibrary.v1';
      const TRASH_FALLBACK_KEY = 'otomeRepoMaker.trash.v1';
      const THEME_FAVORITES_KEY = 'otomeRepoMaker.themeFavorites.v1';
      const REPO_PAGE_KEY = 'otomeRepoMaker.activePage.v1';
      const COLOR_STYLE_KEY = 'otomeRepoMaker.colorStyle.v1';
      const BACKUP_VERSION = 2;

      const editorialPalettes = [
        { id:'mintLavender', name:'薄荷紫雾', swatch:'#8D79A7', vars:{ pageBg1:'#F5F2FA',pageBg2:'#DCDCEC',paper:'#EDE4F4',ink:'#6B6475',muted:'#8F8799',primary:'#8D79A7',primaryStrong:'#8D79A7',secondary:'#DCDCEC',accent:'#B8D9C9',line:'#C6BED7',soft:'#DCDCEC',shadow:'rgba(79,71,91,.08)' } },
        { id:'seaSalt', name:'海盐蓝灰', swatch:'#6F8798', vars:{ pageBg1:'#F2F5F7',pageBg2:'#D0DADF',paper:'#E2EAF0',ink:'#5C6971',muted:'#82919A',primary:'#6F8798',primaryStrong:'#6F8798',secondary:'#D0DADF',accent:'#8FAEC1',line:'#B4C1C9',soft:'#D0DADF',shadow:'rgba(61,75,84,.08)' } },
        { id:'glassSage', name:'玻璃鼠尾草', swatch:'#7F8B6A', vars:{ pageBg1:'#F5F6F1',pageBg2:'#D7DDCF',paper:'#E7EBE1',ink:'#66705F',muted:'#8B9384',primary:'#7F8B6A',primaryStrong:'#7F8B6A',secondary:'#D7DDCF',accent:'#9BB68D',line:'#BFC8B4',soft:'#D7DDCF',shadow:'rgba(67,77,61,.08)' } },
        { id:'springCream', name:'春芽奶油', swatch:'#D9C97C', vars:{ pageBg1:'#FFF9E8',pageBg2:'#F3E8B9',paper:'#FBF3D8',ink:'#45483B',muted:'#7B7B65',primary:'#728756',primaryStrong:'#607347',secondary:'#E5EBCF',accent:'#94AE68',line:'#D8CFA6',soft:'#EEF1D8',shadow:'rgba(78,76,55,.07)' } },
        { id:'mistPinkGray', name:'柔雾樱粉', swatch:'#C68597', vars:{ pageBg1:'#FFF9FB',pageBg2:'#F7E9EF',paper:'#FFF4F7',ink:'#5C4D53',muted:'#917D85',primary:'#B9788B',primaryStrong:'#A9677B',secondary:'#F2DFE7',accent:'#D993A7',line:'#E7CDD7',soft:'#FAEAF0',shadow:'rgba(103,73,84,.06)' } },
        { id:'monetLilac', name:'莫奈睡莲紫', swatch:'#66723B', vars:{ pageBg1:'#F3F0F5',pageBg2:'#C8C1D7',paper:'#E2DDE9',ink:'#4E5142',muted:'#7D806E',primary:'#66723B',primaryStrong:'#56622F',secondary:'#C9C1D8',accent:'#625D83',line:'#AAA2B8',soft:'#D4CEDF',shadow:'rgba(62,58,80,.09)' } },
        { id:'brasilierBluePink', name:'巴西利耶蓝粉', swatch:'#1776C7', vars:{ pageBg1:'#F5F5F8',pageBg2:'#F4D3EA',paper:'#DDEBFA',ink:'#43516A',muted:'#7B8597',primary:'#1776C7',primaryStrong:'#1776C7',secondary:'#F4D3EA',accent:'#E859A9',line:'#B9CCE3',soft:'#F4D3EA',shadow:'rgba(42,69,101,.08)' } },
        { id:'sleepingUltramarine', name:'群青入眠', swatch:'#10206B', vars:{ pageBg1:'#F6F2E8',pageBg2:'#C8D7EA',paper:'#E8DDC9',ink:'#4C4A43',muted:'#827A6E',primary:'#10206B',primaryStrong:'#10206B',secondary:'#C8D7EA',accent:'#015185',line:'#B9A98E',soft:'#C8D7EA',shadow:'rgba(31,35,61,.09)' } },
        { id:'snowNight', name:'雪夜蓝灰', swatch:'#646484', vars:{ pageBg1:'#F4F6FB',pageBg2:'#BBC4D4',paper:'#E4E5EC',ink:'#55566A',muted:'#7F8191',primary:'#646484',primaryStrong:'#646484',secondary:'#BBC4D4',accent:'#091328',line:'#9DA6BB',soft:'#BBC4D4',shadow:'rgba(43,46,68,.09)' } },
        { id:'cocoaNude', name:'可可裸棕', swatch:'#6E3B29', vars:{ pageBg1:'#FBF6F2',pageBg2:'#E8D2C4',paper:'#F2E7DE',ink:'#4B332B',muted:'#7D665B',primary:'#6E3B29',primaryStrong:'#6E3B29',secondary:'#E8D2C4',accent:'#A65F43',line:'#C7A692',soft:'#E8D2C4',shadow:'rgba(75,51,43,.07)' } },
        { id:'coffeeMilkBrown', name:'咖啡奶棕', swatch:'#7A5C49', vars:{ pageBg1:'#F7F1EB',pageBg2:'#D8C2B0',paper:'#EBDCCF',ink:'#5A463A',muted:'#8E796A',primary:'#7A5C49',primaryStrong:'#7A5C49',secondary:'#D8C2B0',accent:'#B68B6D',line:'#BFA691',soft:'#D8C2B0',shadow:'rgba(66,49,39,.08)' } },
        { id:'crateOrange', name:'木箱橙', swatch:'#6F3B20', vars:{ pageBg1:'#F8F3EB',pageBg2:'#DCC7AF',paper:'#ECE3D7',ink:'#3A312A',muted:'#74685E',primary:'#6F3B20',primaryStrong:'#6F3B20',secondary:'#DCC7AF',accent:'#C86A1C',line:'#B79B7A',soft:'#DCC7AF',shadow:'rgba(58,49,42,.07)' } },
        { id:'deepRedStillness', name:'深红静谧', swatch:'#561918', vars:{ pageBg1:'#F5F1EE',pageBg2:'#ADA194',paper:'#DCD9D4',ink:'#3A3132',muted:'#7E7470',primary:'#561918',primaryStrong:'#561918',secondary:'#ADA194',accent:'#971C1E',line:'#C6BBAF',soft:'#ADA194',shadow:'rgba(52,31,31,.09)' } },
        { id:'plumWine', name:'李子酒紫', swatch:'#5B1E32', vars:{ pageBg1:'#F2EDF4',pageBg2:'#B8AFC5',paper:'#D7D0DF',ink:'#4D4154',muted:'#827987',primary:'#5B1E32',primaryStrong:'#5B1E32',secondary:'#B8AFC5',accent:'#351E28',line:'#968EA6',soft:'#B8AFC5',shadow:'rgba(50,32,46,.09)' } },
        { id:'sakuraNight', name:'樱夜烟紫', swatch:'#74646F', vars:{ pageBg1:'#F4F1F2',pageBg2:'#D1C7CB',paper:'#E7DFE1',ink:'#454146',muted:'#81777C',primary:'#74646F',primaryStrong:'#665762',secondary:'#D5C9CE',accent:'#3F3942',line:'#B7ABB0',soft:'#DCD2D6',shadow:'rgba(49,43,48,.08)' } },
        { id:'peacockGoldGreen', name:'孔雀金绿', swatch:'#073B48', vars:{ pageBg1:'#F4F7F3',pageBg2:'#9EC7BC',paper:'#DCC29A',ink:'#274246',muted:'#6D7F7B',primary:'#073B48',primaryStrong:'#073B48',secondary:'#9EC7BC',accent:'#009B6E',line:'#B5A37C',soft:'#9EC7BC',shadow:'rgba(27,55,56,.09)' } },
        { id:'forestGoldMoss', name:'深林金苔', swatch:'#36533B', vars:{ pageBg1:'#F6F3E9',pageBg2:'#D6CFB5',paper:'#EAE3D1',ink:'#30362F',muted:'#6D7468',primary:'#36533B',primaryStrong:'#36533B',secondary:'#D6CFB5',accent:'#9A742D',line:'#A89A72',soft:'#D6CFB5',shadow:'rgba(48,54,47,.07)' } },
        { id:'redFuji', name:'赤富士', swatch:'#982D19', vars:{ pageBg1:'#F7F3E8',pageBg2:'#EFD894',paper:'#EAEAD7',ink:'#4B4A3E',muted:'#7D7665',primary:'#982D19',primaryStrong:'#982D19',secondary:'#EFD894',accent:'#2D5694',line:'#CDBB8E',soft:'#EFD894',shadow:'rgba(61,49,37,.08)' } },
        { id:'sakuraWaterside', name:'樱花水岸', swatch:'#68888F', vars:{ pageBg1:'#FBF8F5',pageBg2:'#E5EEF0',paper:'#F5ECEC',ink:'#4E4A4C',muted:'#7E7679',primary:'#68888F',primaryStrong:'#68888F',secondary:'#E5EEF0',accent:'#C77F8A',line:'#CFC1C1',soft:'#E5EEF0',shadow:'rgba(78,74,76,.07)' } },
        { id:'minimalMono', name:'极简黑白灰', swatch:'#1F1F1D', vars:{ pageBg1:'#F7F7F5',pageBg2:'#EFEFEC',paper:'#FFFFFF',ink:'#4A4A46',muted:'#85857F',primary:'#1F1F1D',primaryStrong:'#1F1F1D',secondary:'#EFEFEC',accent:'#8F8F88',line:'#D6D6D1',soft:'#EFEFEC',shadow:'rgba(31,31,29,.07)' } },
        { id:'mintChocolate', name:'薄荷巧克力', swatch:'#7EB7AA', vars:{ pageBg1:'#F1E9CE',pageBg2:'#D8CFB0',paper:'#FAF6E7',ink:'#4C3D2F',muted:'#817161',primary:'#7EB7AA',primaryStrong:'#4F8F83',secondary:'#D8CFB0',accent:'#6B5140',line:'#C8B998',soft:'#EFE6C9',shadow:'rgba(76,61,47,.09)' } },
        { id:'summerCherry', name:'复古樱桃', swatch:'#772424', vars:{ pageBg1:'#E0CD93',pageBg2:'#B9D4CA',paper:'#F4E8C7',ink:'#443B15',muted:'#756B45',primary:'#66A091',primaryStrong:'#772424',secondary:'#E0CD93',accent:'#66A091',line:'#BAA66F',soft:'#E6D9AD',shadow:'rgba(68,59,21,.11)' } },
        { id:'royalMango', name:'皇家芒果', swatch:'#4169E1', vars:{ pageBg1:'#FFF3A0',pageBg2:'#B8C9FF',paper:'#F0FFF0',ink:'#2F3C66',muted:'#66739A',primary:'#4169E1',primaryStrong:'#3457C7',secondary:'#FFD700',accent:'#E6B800',line:'#AAB9E9',soft:'#EAF0FF',shadow:'rgba(65,105,225,.15)' } },
        { id:'citrusCircuit', name:'柑橘回路', swatch:'#48D1ED', vars:{ pageBg1:'#BCEFF5',pageBg2:'#FFE2C8',paper:'#F7FFF2',ink:'#315B66',muted:'#6B8B91',primary:'#48D1ED',primaryStrong:'#269DB6',secondary:'#E0FFD7',accent:'#FBC59F',line:'#A7D8D5',soft:'#E8FBE5',shadow:'rgba(72,209,237,.14)' } }
      ];

      const richPalettes = [
        {
                "id": "mintLavender",
                "name": "薄荷紫雾",
                "swatch": "#A894C5",
                "vars": {
                        "pageBg1": "#F6F1FA",
                        "pageBg2": "#EEF5F1",
                        "paper": "#FFFDFC",
                        "ink": "#5B5368",
                        "muted": "#998FA5",
                        "primary": "#C8BADB",
                        "primaryStrong": "#8972A8",
                        "secondary": "#DDEBDF",
                        "accent": "#9CBFAE",
                        "line": "#D5CBDD",
                        "soft": "#F2ECF7",
                        "shadow": "rgba(96,82,116,.10)"
                }
        },
        {
                "id": "seaSalt",
                "name": "海盐蓝灰",
                "swatch": "#7D95A7",
                "vars": {
                        "pageBg1": "#EFF4F7",
                        "pageBg2": "#F7FAFB",
                        "paper": "#FEFEFE",
                        "ink": "#54616D",
                        "muted": "#8B99A4",
                        "primary": "#B7C8D5",
                        "primaryStrong": "#6F8798",
                        "secondary": "#DDE7EC",
                        "accent": "#8FB7C7",
                        "line": "#C9D5DC",
                        "soft": "#EEF4F6",
                        "shadow": "rgba(77,92,106,.10)"
                }
        },
        {
                "id": "glassSage",
                "name": "玻璃鼠尾草",
                "swatch": "#809079",
                "vars": {
                        "pageBg1": "#F3F6F0",
                        "pageBg2": "#FAFBF7",
                        "paper": "#FFFEFC",
                        "ink": "#5B6255",
                        "muted": "#8F9887",
                        "primary": "#CCD7C4",
                        "primaryStrong": "#73846B",
                        "secondary": "#E6EBD8",
                        "accent": "#A6B68F",
                        "line": "#D1D8C7",
                        "soft": "#F0F5E9",
                        "shadow": "rgba(85,95,76,.10)"
                }
        },
        {
                "id": "springCream",
                "name": "春芽奶油",
                "swatch": "#D8C97A",
                "vars": {
                        "pageBg1": "#FAF5DE",
                        "pageBg2": "#FFFBEA",
                        "paper": "#FFFDF3",
                        "ink": "#676042",
                        "muted": "#9D9773",
                        "primary": "#E8DEAA",
                        "primaryStrong": "#7D9262",
                        "secondary": "#F5E9B7",
                        "accent": "#C0D38B",
                        "line": "#E4D7AA",
                        "soft": "#F7F1D7",
                        "shadow": "rgba(106,99,67,.09)"
                }
        },
        {
                "id": "mistPinkGray",
                "name": "柔雾樱粉",
                "swatch": "#D99CAD",
                "vars": {
                        "pageBg1": "#FFF6F8",
                        "pageBg2": "#FFFDFE",
                        "paper": "#FFFDFD",
                        "ink": "#6C5862",
                        "muted": "#A08893",
                        "primary": "#F1CDD7",
                        "primaryStrong": "#BF7E95",
                        "secondary": "#F8DFE6",
                        "accent": "#E7B7C5",
                        "line": "#EED5DC",
                        "soft": "#FCEEF2",
                        "shadow": "rgba(115,89,101,.08)"
                }
        },
        {
                "id": "monetLilac",
                "name": "莫奈睡莲紫",
                "swatch": "#788650",
                "vars": {
                        "pageBg1": "#F3F0F7",
                        "pageBg2": "#F9F7F2",
                        "paper": "#FFFEFC",
                        "ink": "#5F5A68",
                        "muted": "#8F8998",
                        "primary": "#CFC7D8",
                        "primaryStrong": "#6E7C48",
                        "secondary": "#E4DCC8",
                        "accent": "#8A7C9D",
                        "line": "#D3CCD8",
                        "soft": "#ECE7F0",
                        "shadow": "rgba(87,82,98,.10)"
                }
        },
        {
                "id": "brasilierBluePink",
                "name": "巴西利耶蓝粉",
                "swatch": "#1D76C8",
                "vars": {
                        "pageBg1": "#F7F3FA",
                        "pageBg2": "#F5F9FD",
                        "paper": "#FFFEFF",
                        "ink": "#4F5870",
                        "muted": "#8A8FA4",
                        "primary": "#C9D9EF",
                        "primaryStrong": "#1F6FB2",
                        "secondary": "#F4D5E8",
                        "accent": "#D995BA",
                        "line": "#D5DCEA",
                        "soft": "#F5EEF7",
                        "shadow": "rgba(58,79,112,.10)"
                }
        },
        {
                "id": "sleepingUltramarine",
                "name": "群青入眠",
                "swatch": "#243B82",
                "vars": {
                        "pageBg1": "#EFF3FA",
                        "pageBg2": "#FBF8F0",
                        "paper": "#FFFEFB",
                        "ink": "#45506A",
                        "muted": "#888D9B",
                        "primary": "#CCD8EF",
                        "primaryStrong": "#243B82",
                        "secondary": "#E7D9C0",
                        "accent": "#A69579",
                        "line": "#CCD4E1",
                        "soft": "#EDF1F8",
                        "shadow": "rgba(54,63,86,.11)"
                }
        },
        {
                "id": "snowNight",
                "name": "雪夜蓝灰",
                "swatch": "#6E718C",
                "vars": {
                        "pageBg1": "#F1F3F8",
                        "pageBg2": "#F9FAFC",
                        "paper": "#FEFFFF",
                        "ink": "#596172",
                        "muted": "#8C93A2",
                        "primary": "#C8D0DF",
                        "primaryStrong": "#6A6D87",
                        "secondary": "#DEE6EE",
                        "accent": "#A7B1C3",
                        "line": "#CDD5E0",
                        "soft": "#EDF1F6",
                        "shadow": "rgba(69,74,93,.10)"
                }
        },
        {
                "id": "cocoaNude",
                "name": "可可裸棕",
                "swatch": "#7B4A39",
                "vars": {
                        "pageBg1": "#FAF2EC",
                        "pageBg2": "#FFF9F5",
                        "paper": "#FFFDFC",
                        "ink": "#68564F",
                        "muted": "#9C8A82",
                        "primary": "#D9C1B4",
                        "primaryStrong": "#7B4A39",
                        "secondary": "#EFD5CB",
                        "accent": "#C99985",
                        "line": "#DEC8BB",
                        "soft": "#F6E8E1",
                        "shadow": "rgba(95,71,60,.10)"
                }
        },
        {
                "id": "coffeeMilkBrown",
                "name": "咖啡奶棕",
                "swatch": "#86644E",
                "vars": {
                        "pageBg1": "#F8F1EB",
                        "pageBg2": "#FCFAF7",
                        "paper": "#FFFEFC",
                        "ink": "#67594F",
                        "muted": "#9A8B7F",
                        "primary": "#D5C3B5",
                        "primaryStrong": "#7A5C49",
                        "secondary": "#EADCCF",
                        "accent": "#B79278",
                        "line": "#D9CCBF",
                        "soft": "#F3EAE3",
                        "shadow": "rgba(94,73,60,.10)"
                }
        },
        {
                "id": "crateOrange",
                "name": "木箱橙",
                "swatch": "#8E5B31",
                "vars": {
                        "pageBg1": "#FAF0E4",
                        "pageBg2": "#FFF9F1",
                        "paper": "#FFFDF9",
                        "ink": "#6D5948",
                        "muted": "#9A846F",
                        "primary": "#E0C4A0",
                        "primaryStrong": "#7C4725",
                        "secondary": "#F0D8BF",
                        "accent": "#C98C59",
                        "line": "#DFCCB4",
                        "soft": "#F6EBDD",
                        "shadow": "rgba(93,76,58,.10)"
                }
        },
        {
                "id": "deepRedStillness",
                "name": "深红静谧",
                "swatch": "#6B2525",
                "vars": {
                        "pageBg1": "#F7F0EF",
                        "pageBg2": "#FAF7F3",
                        "paper": "#FFFEFC",
                        "ink": "#635554",
                        "muted": "#968684",
                        "primary": "#D8C2BE",
                        "primaryStrong": "#6B2525",
                        "secondary": "#E9D9CD",
                        "accent": "#A86F63",
                        "line": "#DCCDC4",
                        "soft": "#F2E6E2",
                        "shadow": "rgba(87,61,57,.11)"
                }
        },
        {
                "id": "plumWine",
                "name": "李子酒紫",
                "swatch": "#6A2E49",
                "vars": {
                        "pageBg1": "#F5F0F5",
                        "pageBg2": "#FBF8FA",
                        "paper": "#FFFEFD",
                        "ink": "#61555E",
                        "muted": "#958995",
                        "primary": "#D7C7D1",
                        "primaryStrong": "#6A2E49",
                        "secondary": "#E7D9E3",
                        "accent": "#B47E98",
                        "line": "#D9CCD5",
                        "soft": "#F2EAF0",
                        "shadow": "rgba(80,57,72,.11)"
                }
        },
        {
                "id": "sakuraNight",
                "name": "樱夜烟紫",
                "swatch": "#7B6A72",
                "vars": {
                        "pageBg1": "#F6F1F3",
                        "pageBg2": "#FBF8F8",
                        "paper": "#FFFDFD",
                        "ink": "#61565D",
                        "muted": "#968A91",
                        "primary": "#D9C8CF",
                        "primaryStrong": "#74646F",
                        "secondary": "#E8DADF",
                        "accent": "#BCA3AC",
                        "line": "#DCCFD4",
                        "soft": "#F3E9EC",
                        "shadow": "rgba(86,74,80,.10)"
                }
        },
        {
                "id": "exoticOrangeGreen",
                "name": "异域橘绿",
                "swatch": "#2A4A3B",
                "vars": {
                        "pageBg1": "#F5F1E8",
                        "pageBg2": "#FFF7E9",
                        "paper": "#FFFCF7",
                        "ink": "#4F534C",
                        "muted": "#87856D",
                        "primary": "#D7CFB5",
                        "primaryStrong": "#2A4A3B",
                        "secondary": "#E8C893",
                        "accent": "#C97C4B",
                        "line": "#D6C8A5",
                        "soft": "#F1E7D0",
                        "shadow": "rgba(55,60,50,.12)"
                }
        },
        {
                "id": "peacockGoldGreen",
                "name": "孔雀金绿",
                "swatch": "#0F4E57",
                "vars": {
                        "pageBg1": "#EEF7F4",
                        "pageBg2": "#FAF8F0",
                        "paper": "#FFFEFB",
                        "ink": "#4C5A5D",
                        "muted": "#859496",
                        "primary": "#BFD8D1",
                        "primaryStrong": "#0F4E57",
                        "secondary": "#E7D5A2",
                        "accent": "#9B7A47",
                        "line": "#C5D8D4",
                        "soft": "#E7F2EF",
                        "shadow": "rgba(43,67,72,.12)"
                }
        },
        {
                "id": "forestGoldMoss",
                "name": "深林金苔",
                "swatch": "#486246",
                "vars": {
                        "pageBg1": "#F2F5EC",
                        "pageBg2": "#FBFAF3",
                        "paper": "#FFFDF8",
                        "ink": "#576050",
                        "muted": "#8C927C",
                        "primary": "#CDD5BE",
                        "primaryStrong": "#486246",
                        "secondary": "#E3D8B5",
                        "accent": "#A69364",
                        "line": "#D3D4C0",
                        "soft": "#EDF1E2",
                        "shadow": "rgba(67,72,58,.11)"
                }
        },
        {
                "id": "redFuji",
                "name": "赤富士",
                "swatch": "#A03D21",
                "vars": {
                        "pageBg1": "#F9F3EE",
                        "pageBg2": "#FBF8F1",
                        "paper": "#FFFEFA",
                        "ink": "#69584D",
                        "muted": "#9A887A",
                        "primary": "#DFCAB7",
                        "primaryStrong": "#A03D21",
                        "secondary": "#EAD89C",
                        "accent": "#C48E56",
                        "line": "#DED2BC",
                        "soft": "#F5ECDD",
                        "shadow": "rgba(98,79,61,.10)"
                }
        },
        {
                "id": "sakuraWaterside",
                "name": "樱花水岸",
                "swatch": "#68888F",
                "vars": {
                        "pageBg1": "#F8F2F3",
                        "pageBg2": "#EEF6F7",
                        "paper": "#FFFEFE",
                        "ink": "#5C5B61",
                        "muted": "#939097",
                        "primary": "#D7CBCB",
                        "primaryStrong": "#68888F",
                        "secondary": "#F1E4C1",
                        "accent": "#D0A7B4",
                        "line": "#DDD4D4",
                        "soft": "#EFF5F6",
                        "shadow": "rgba(86,84,87,.10)"
                }
        },
        {
                "id": "minimalMono",
                "name": "极简黑白灰",
                "swatch": "#2B2B29",
                "vars": {
                        "pageBg1": "#F7F7F4",
                        "pageBg2": "#ECECE7",
                        "paper": "#FFFEFB",
                        "ink": "#3D3D39",
                        "muted": "#7E7E77",
                        "primary": "#DCDCD5",
                        "primaryStrong": "#2B2B29",
                        "secondary": "#E8E8E1",
                        "accent": "#909088",
                        "line": "#D3D3CB",
                        "soft": "#F0F0EB",
                        "shadow": "rgba(40,40,36,.08)"
                }
        }
];

      const darkPalettes = [
        { id:'exoticOrangeGreen', name:'异域橘绿', swatch:'#243B2E', check:'#F2E7D0', vars:{ pageBg1:'#17241C',pageBg2:'#314E3B',paper:'#243B2E',ink:'#F2E7D0',muted:'#C8BFAE',primary:'#E0B95F',primaryStrong:'#F0CF7A',secondary:'#314E3B',accent:'#E27540',line:'#786A43',soft:'#1C3024',shadow:'rgba(4,12,7,.55)' } },
        { id:'midnightViolet', name:'午夜紫罗兰', swatch:'#241D38', check:'#F3ECFF', vars:{ pageBg1:'#100D18',pageBg2:'#1A1428',paper:'#211A31',ink:'#F3ECFF',muted:'#B9AEC9',primary:'#9D82D1',primaryStrong:'#C0A5F2',secondary:'#332847',accent:'#E087B4',line:'#55466D',soft:'#2B223E',shadow:'rgba(4,2,10,.58)' } },
        { id:'navyRose', name:'深海玫瑰', swatch:'#12263A', check:'#EDF6FF', vars:{ pageBg1:'#08121D',pageBg2:'#10263A',paper:'#12283C',ink:'#EDF6FF',muted:'#A9BACA',primary:'#6FA7D2',primaryStrong:'#9BC8EA',secondary:'#203B50',accent:'#E27A9D',line:'#385972',soft:'#193247',shadow:'rgba(2,7,13,.60)' } },
        { id:'forestMoon', name:'月下深林', swatch:'#172B25', check:'#EEF7E9', vars:{ pageBg1:'#09130F',pageBg2:'#14271F',paper:'#193029',ink:'#EEF7E9',muted:'#A8BBAE',primary:'#77AA8E',primaryStrong:'#9BC8AA',secondary:'#29483A',accent:'#D5B86A',line:'#426755',soft:'#203B31',shadow:'rgba(2,9,5,.60)' } },
        { id:'burgundyVelvet', name:'酒红天鹅绒', swatch:'#351820', check:'#FFF0F2', vars:{ pageBg1:'#180A0E',pageBg2:'#2B1118',paper:'#35171F',ink:'#FFF0F2',muted:'#C9AEB3',primary:'#C86B82',primaryStrong:'#EA92A5',secondary:'#50232D',accent:'#E0B06B',line:'#70404A',soft:'#421D27',shadow:'rgba(12,2,5,.62)' } },
        { id:'charcoalGold', name:'炭黑鎏金', swatch:'#242321', check:'#FAF2DC', vars:{ pageBg1:'#11110F',pageBg2:'#1B1A17',paper:'#252421',ink:'#FAF2DC',muted:'#BBB3A2',primary:'#BBA05E',primaryStrong:'#DEC276',secondary:'#37342D',accent:'#D49B52',line:'#5D5545',soft:'#302E29',shadow:'rgba(0,0,0,.64)' } },
        { id:'inkTeal', name:'墨色青黛', swatch:'#102D30', check:'#E8FAF8', vars:{ pageBg1:'#071416',pageBg2:'#0C2528',paper:'#123033',ink:'#E8FAF8',muted:'#9FBDBB',primary:'#5CA7A2',primaryStrong:'#83CAC3',secondary:'#21474A',accent:'#E18A68',line:'#386366',soft:'#183A3D',shadow:'rgba(1,8,9,.62)' } },
        { id:'cocoaNight', name:'可可夜幕', swatch:'#2E231F', check:'#FFF3EA', vars:{ pageBg1:'#15100D',pageBg2:'#261C18',paper:'#30241F',ink:'#FFF3EA',muted:'#C4B2A7',primary:'#B98669',primaryStrong:'#D9A98C',secondary:'#49352C',accent:'#DC8068',line:'#695044',soft:'#3C2C26',shadow:'rgba(9,5,3,.62)' } },
        { id:'indigoMist', name:'靛蓝夜雾', swatch:'#19253E', check:'#EEF1FF', vars:{ pageBg1:'#0A0E1A',pageBg2:'#141D32',paper:'#1B2741',ink:'#EEF1FF',muted:'#AAB2CC',primary:'#778EC8',primaryStrong:'#9DB0E6',secondary:'#2C3B5A',accent:'#C78BC9',line:'#47577B',soft:'#22304D',shadow:'rgba(2,4,12,.64)' } },
        { id:'blackSakura', name:'黑樱夜色', swatch:'#2B2028', check:'#FFF0F7', vars:{ pageBg1:'#130D11',pageBg2:'#21171E',paper:'#2C2028',ink:'#FFF0F7',muted:'#C2ACB8',primary:'#B77E9C',primaryStrong:'#D9A3BE',secondary:'#44313E',accent:'#EB86A5',line:'#62485A',soft:'#382934',shadow:'rgba(8,2,6,.64)' } },
        { id:'bordeauxGoldNight', name:'波尔多金夜', swatch:'#4A010A', check:'#F3D39C', vars:{ pageBg1:'#090203',pageBg2:'#1A080B',paper:'#160609',ink:'#F3D39C',muted:'#C6A77D',primary:'#C18F4E',primaryStrong:'#E0B875',secondary:'#312520',accent:'#8D1823',line:'#65402F',soft:'#260B0F',shadow:'rgba(0,0,0,.68)' } },
        { id:'nightBlueGarden', name:'夜蓝花庭', swatch:'#0B2492', check:'#D9D8D8', vars:{ pageBg1:'#08090E',pageBg2:'#111523',paper:'#11141C',ink:'#D9D8D8',muted:'#C3B799',primary:'#7098C0',primaryStrong:'#9AB9D6',secondary:'#3E2F44',accent:'#0B2492',line:'#62342B',soft:'#1B1A26',shadow:'rgba(0,0,0,.66)' } },
        { id:'inkScarlet', name:'墨夜朱樱', swatch:'#9D110E', check:'#D9D8D8', vars:{ pageBg1:'#040304',pageBg2:'#100A0A',paper:'#0C0B0D',ink:'#D9D8D8',muted:'#B77270',primary:'#608595',primaryStrong:'#86AFC0',secondary:'#9D110E',accent:'#D43832',line:'#54383A',soft:'#171416',shadow:'rgba(0,0,0,.72)' } },
        { id:'vintageTelephone', name:'复古电话亭', swatch:'#953004', check:'#D7D4CF', vars:{ pageBg1:'#110F06',pageBg2:'#17172D',paper:'#1D1E46',ink:'#D7D4CF',muted:'#AAAAB8',primary:'#45497D',primaryStrong:'#7B80B5',secondary:'#953004',accent:'#C65B38',line:'#5A514B',soft:'#292944',shadow:'rgba(0,0,0,.68)' } },
        { id:'pureBlackWhiteGray', name:'纯黑白灰', swatch:'#000000', check:'#FFFFFF', vars:{ pageBg1:'#000000',pageBg2:'#080808',paper:'#050505',ink:'#FFFFFF',muted:'#FFFFFF',primary:'#666666',primaryStrong:'#FFFFFF',secondary:'#121212',accent:'#3A3A3A',line:'#262626',soft:'#0C0C0C',shadow:'rgba(0,0,0,.82)' } }
      ];

      let palettes = richPalettes;

      const richThemeGroups = [
        {
                "name": "柔雾浅色",
                "ids": [
                        "mintLavender",
                        "seaSalt",
                        "glassSage",
                        "springCream",
                        "mistPinkGray",
                        "minimalMono"
                ]
        },
        {
                "name": "艺术画作",
                "ids": [
                        "monetLilac",
                        "brasilierBluePink",
                        "sleepingUltramarine",
                        "snowNight"
                ]
        },
        {
                "name": "温暖治愈",
                "ids": [
                        "cocoaNude",
                        "coffeeMilkBrown",
                        "crateOrange"
                ]
        },
        {
                "name": "浓郁戏剧",
                "ids": [
                        "deepRedStillness",
                        "plumWine",
                        "sakuraNight"
                ]
        },
        {
                "name": "异国情调",
                "ids": [
                        "exoticOrangeGreen",
                        "peacockGoldGreen",
                        "forestGoldMoss"
                ]
        },
        {
                "name": "和风画册",
                "ids": [
                        "redFuji",
                        "sakuraWaterside"
                ]
        }
];

      const editorialThemeGroups = [
        { name:'柔雾浅色', ids:['mintLavender','seaSalt','glassSage','springCream','mistPinkGray','minimalMono'] },
        { name:'艺术画作', ids:['monetLilac','brasilierBluePink','sleepingUltramarine','snowNight'] },
        { name:'温暖治愈', ids:['cocoaNude','coffeeMilkBrown','crateOrange'] },
        { name:'浓郁戏剧', ids:['deepRedStillness','plumWine','sakuraNight'] },
        { name:'自然与和风', ids:['peacockGoldGreen','forestGoldMoss','redFuji','sakuraWaterside'] },
        { name:'清新甜点', ids:['mintChocolate'] },
        { name:'明快撞色', ids:['summerCherry','royalMango','citrusCircuit'] }
      ];

      const darkThemeGroups = [
        { name:'夜色经典', ids:['exoticOrangeGreen','midnightViolet','navyRose','charcoalGold','nightBlueGarden','vintageTelephone'] },
        { name:'深林与海', ids:['forestMoon','inkTeal','indigoMist'] },
        { name:'酒红暖夜', ids:['burgundyVelvet','cocoaNight','blackSakura','bordeauxGoldNight','inkScarlet'] },
        { name:'黑白极简', ids:['pureBlackWhiteGray'] }
      ];

      let themeGroups = richThemeGroups;

      const ratingNames = ['剧情','创意','感情','文笔','氛围','立意','趣味','立绘','CG','音乐','配音','总体'];
      const imageTargets = {
        cover: { img:'coverImg', name:'gameName', kind:'vn', title:'选择作品封面' },
        favorite: { img:'favoriteImg', kind:'character', title:'选择最喜欢人物图片' },
        tasteBlind: { img:'tasteBlindImg', kind:'character', title:'选择“盲狙”人物头像' },
        tasteLooks: { img:'tasteLooksImg', kind:'character', title:'选择“外貌”人物头像' },
        tasteVoice: { img:'tasteVoiceImg', kind:'character', title:'选择“声音”人物头像' },
        tastePersonality: { img:'tastePersonalityImg', kind:'character', title:'选择“性格”人物头像' },
        tastePlot: { img:'tastePlotImg', kind:'character', title:'选择“剧情”人物头像' },
        tasteDynamic: { img:'tasteDynamicImg', kind:'character', title:'选择“关系性”人物头像' }
      };

      let currentTarget = 'cover';
      let toastTimer;
      let currentArchiveId = localStorage.getItem(CURRENT_ARCHIVE_KEY) || '';
      let archiveAutosaveTimer = null;
      let archiveDbPromise = null;
      let cachedArchives = [];
      let cachedTrash = [];
      let cachedImageLibrary = [];
      let archiveView = 'active';
      let showOnlyFavoriteThemes = false;
      let themeReturnFocus = null;
      let cropDrag = null;
      let lastSavedAt = Date.now();
      let activeRepoPage = 'full';
      const emptyImages = () => ({ cover:'', favorite:'', tasteBlind:'', tasteLooks:'', tasteVoice:'', tastePersonality:'', tastePlot:'', tasteDynamic:'' });
      function defaultImageTransform(target) { return target === 'cover' ? {x:50,y:50,scale:1} : {x:50,y:4,scale:1}; }
      function emptyImageTransforms() { return Object.fromEntries(Object.keys(imageTargets).map(target => [target, defaultImageTransform(target)])); }
      let state = {
        palette:'mintLavender', completion:'yes', platform:'', language:'',
        ratings:Object.fromEntries(ratingNames.map(name => [name, 0])),
        images:emptyImages(), imageTransforms:emptyImageTransforms()
      };

      const $ = (selector, root=document) => root.querySelector(selector);
      const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
      const longRepoTemplate = $('#longRepoCard')?.cloneNode(true);

      function showToast(message) {
        const toast = $('#toast');
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
      }

      function longRepoPages() { return $$('.long-repo-page'); }

      function renderPageSwitch() {
        const host = $('#longPageButtons'); if (!host) return;
        host.innerHTML = '';
        longRepoPages().forEach((card, index) => {
          const entry = document.createElement('span'); entry.className = 'long-page-entry';
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'page-switch-btn';
          button.dataset.repoPage = card.dataset.pageId || `long-${index + 1}`;
          const pageNumber = card.querySelector('.long-repo-page-number')?.value.trim() || String(index + 1).padStart(2,'0');
          button.textContent = `长评 ${pageNumber}`;
          button.setAttribute('aria-pressed', String(button.dataset.repoPage === activeRepoPage));
          button.classList.toggle('active', button.dataset.repoPage === activeRepoPage);
          button.addEventListener('click', () => applyRepoPage(button.dataset.repoPage, true));
          entry.appendChild(button);
          if (longRepoPages().length >= 1) {
            const remove = document.createElement('button');
            remove.type = 'button'; remove.className = 'long-page-delete'; remove.textContent = '×'; remove.title = `删除${button.textContent}`;
            remove.addEventListener('click', event => { event.stopPropagation(); removeLongRepoPage(card.dataset.pageId); });
            entry.appendChild(remove);
          }
          host.appendChild(entry);
        });
      }

      function removeLongRepoPage(pageId) {
        const pages = longRepoPages();
        const card = pages.find(item => item.dataset.pageId === pageId);
        if (!card) return;
        const wasActive = activeRepoPage === pageId;
        card.remove();
        renderPageSwitch();
        if (wasActive) applyRepoPage('full', true);
        else { renderPageSwitch(); saveState(); }
      }

      function addLongRepoPage(activate=true) {
        const pages = longRepoPages();
        const index = pages.length + 1;
        const base = $('#longRepoCard') || longRepoTemplate;
        if (!base) return null;
        const card = base.cloneNode(true);
        card.id = `longRepoCard-${index}`;
        card.dataset.pageId = `long-${index}`;
        card.hidden = true;
        card.querySelectorAll('[id]').forEach(el => { el.id = `${el.id}-${index}`; });
        card.querySelectorAll('[data-key]').forEach(el => { el.dataset.key = `${el.dataset.key}-${index}`; });
        card.querySelectorAll('.persist').forEach(el => { delete el.dataset.persistBound; });
        card.querySelector('.long-repo-title').value = '标题';
        card.querySelector('.long-repo-page-number').value = String(index).padStart(2,'0');
        card.querySelector(`[data-key="longRepoSubject-${index}"]`).value = '';
        card.querySelector(`[data-key="longRepoKeywords-${index}"]`).value = '';
        card.querySelector('.long-repo-text').value = '';
        card.querySelector('[id^="longRepoCount"]').textContent = '0 字';
        $('#canvasShell').appendChild(card);
        bindPersistFields(card);
        renderPageSwitch();
        if (activate) { applyRepoPage(card.dataset.pageId, true); saveState(); }
        return card;
      }

      function ensureLongRepoPages(count=0) {
        const target = Math.max(0, Number(count) || 0);
        while (longRepoPages().length > target) longRepoPages().at(-1)?.remove();
        while (longRepoPages().length < target) addLongRepoPage(false);
        if (!longRepoPages().some(card => card.dataset.pageId === activeRepoPage)) activeRepoPage='full';
        renderPageSwitch();
      }

      function applyRepoPage(page='full', persist=false) {
        if (page === 'long') page = 'long-1';
        const targetCard = page === 'full' ? $('#repoCard') : $(`[data-page-id="${CSS.escape(page)}"]`);
        activeRepoPage = targetCard ? page : 'full';
        $$('.repo-page').forEach(card => { card.hidden = card !== (activeRepoPage === 'full' ? $('#repoCard') : targetCard); });
        document.body.dataset.repoPage = activeRepoPage;
        renderPageSwitch();
        const fullPageButton = $('[data-repo-page="full"]');
        if (fullPageButton) {
          const fullActive = activeRepoPage === 'full';
          fullPageButton.classList.toggle('active', fullActive);
          fullPageButton.setAttribute('aria-pressed', String(fullActive));
        }
        const activeCard = activeRepoPage === 'full' ? $('#repoCard') : targetCard;
        if (persist) localStorage.setItem(REPO_PAGE_KEY, activeRepoPage);
        fitCanvas();
        requestAnimationFrame(() => {
          if (activeRepoPage !== 'full') autoFitTextArea(activeCard?.querySelector('.long-repo-text'));
          updateLongRepoCount(activeCard);
        });
      }

      function fitCanvas() {
        const screenshotMode = document.body.classList.contains('screenshot-mode');
        const viewportWidth = window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const sideGap = screenshotMode ? 4 : (viewportWidth <= 700 ? 4 : 10);
        const studioViewport = document.querySelector('.product-view[data-product-view="studio"] .viewport');
        const studioWidth = studioViewport?.clientWidth || viewportWidth;
        /* Use the viewport's real responsive padding instead of assuming desktop spacing. */
        const viewportStyle = studioViewport ? getComputedStyle(studioViewport) : null;
        const viewportPad = (!screenshotMode && viewportStyle)
          ? (parseFloat(viewportStyle.paddingLeft) || 0) + (parseFloat(viewportStyle.paddingRight) || 0)
          : 0;
        const maxW = Math.max(280, studioWidth - viewportPad - sideGap);
        // 750px 固定画布在常见 375px 手机上自动显示为约 50%，无需手动缩放浏览器。
        let scale = Math.min(1, maxW / STAGE_W);
        if (screenshotMode) {
          const maxH = Math.max(420, viewportHeight - 4);
          scale = Math.min(scale, maxH / STAGE_H);
        }
        const shell = $('#canvasShell');
        shell.style.width = `${STAGE_W * scale}px`;
        shell.style.height = `${STAGE_H * scale}px`;
        const activeCard = activeRepoPage === 'full' ? $('#repoCard') : $(`[data-page-id="${CSS.escape(activeRepoPage)}"]`);
        activeCard.style.transform = `scale(${scale})`;
      }

      function readJsonList(key) {
        try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
        catch (error) { return []; }
      }

      function renderPalettes() {
        const list = $('#paletteList');
        list.innerHTML = '';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'theme-current-btn';
        button.id = 'themeBtn';
        button.addEventListener('click', openThemePanel);
        list.appendChild(button);
        updateThemeCurrentButton();
      }

      function updateThemeCurrentButton() {
        const p = palettes.find(item => item.id === state.palette) || palettes[0];
        const button = $('#themeBtn');
        if (!button) return;
        button.innerHTML = `<span>换肤 · ${escapeHtml(p.name)}</span><span class="theme-current-swatches"><i style="background:${p.vars.paper}"></i><i style="background:${p.vars.primaryStrong}"></i><i style="background:${p.vars.accent}"></i></span>`;
      }

      function themeFavorites() { return readJsonList(THEME_FAVORITES_KEY); }
      function toggleThemeFavorite(id) {
        const rows = themeFavorites();
        const next = rows.includes(id) ? rows.filter(item => item !== id) : [...rows, id];
        localStorage.setItem(THEME_FAVORITES_KEY, JSON.stringify(next));
        renderThemePanel();
      }

      function renderThemePanel() {
        const favorites = themeFavorites();
        const groupsBox = $('#themeGroups');
        if (!groupsBox) return;
        groupsBox.innerHTML = '';
        themeGroups.forEach(group => {
          const section = document.createElement('section'); section.className = 'theme-group';
          const heading = document.createElement('h3'); heading.textContent = group.name; section.appendChild(heading);
          const grid = document.createElement('div'); grid.className = 'theme-grid';
          group.ids.map(id => palettes.find(p => p.id === id)).filter(Boolean).forEach(p => {
            const shell = document.createElement('div');
            shell.className = `theme-card-shell${showOnlyFavoriteThemes && !favorites.includes(p.id) ? ' hidden-by-filter' : ''}`;
            const card = document.createElement('button');
            card.type = 'button'; card.className = `theme-card${p.id === state.palette ? ' active' : ''}`;
            card.setAttribute('aria-pressed', String(p.id === state.palette));
            card.innerHTML = `<span class="theme-card-preview"><i style="background:${p.vars.paper}"></i><i style="background:${p.vars.primaryStrong}"></i><i style="background:${p.vars.accent}"></i></span><span class="theme-card-name">${escapeHtml(p.name)}</span>`;
            card.addEventListener('click', () => { applyPalette(p.id, true); renderThemePanel(); });
            const fav = document.createElement('button'); fav.type = 'button'; fav.className = `theme-fav${favorites.includes(p.id) ? ' on' : ''}`; fav.textContent = favorites.includes(p.id) ? '★' : '☆'; fav.setAttribute('aria-label', `${favorites.includes(p.id) ? '取消收藏' : '收藏'}${p.name}`); fav.setAttribute('aria-pressed', String(favorites.includes(p.id)));
            fav.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); toggleThemeFavorite(p.id); });
            shell.append(card, fav); grid.appendChild(shell);
          });
          section.appendChild(grid); groupsBox.appendChild(section);
        });
        const filterBtn = $('#favoriteThemeFilter');
        if (filterBtn) { filterBtn.textContent = showOnlyFavoriteThemes ? '显示全部' : '只看收藏'; filterBtn.setAttribute('aria-pressed', String(showOnlyFavoriteThemes)); }
      }

      function openThemePanel() {
        renderThemePanel();
        const backdrop=$('#themeBackdrop');
        if(!backdrop)return;
        themeReturnFocus=document.activeElement;
        backdrop.classList.add('open');
        backdrop.setAttribute('aria-hidden','false');
        document.body.classList.add('theme-dialog-open');
        requestAnimationFrame(()=>backdrop.querySelector('.theme-card.active,#closeTheme')?.focus());
      }
      function closeThemePanel() {
        const backdrop=$('#themeBackdrop');
        if(!backdrop?.classList.contains('open'))return;
        backdrop.classList.remove('open');
        backdrop.setAttribute('aria-hidden','true');
        document.body.classList.remove('theme-dialog-open');
        if(themeReturnFocus instanceof HTMLElement)themeReturnFocus.focus();
        themeReturnFocus=null;
      }

      function applyColorStyle(style, persist=false) {
        const nextStyle = ['gradient','solid','dark'].includes(style) ? style : 'gradient';
        if (nextStyle === 'dark') {
          palettes = darkPalettes;
          themeGroups = darkThemeGroups;
        } else if (nextStyle === 'solid') {
          palettes = editorialPalettes;
          themeGroups = editorialThemeGroups;
        } else {
          palettes = richPalettes;
          themeGroups = richThemeGroups;
        }
        $('#solidStyle')?.toggleAttribute('disabled', nextStyle !== 'gradient');
        document.body.dataset.colorStyle = nextStyle;
        $$('.color-style-btn').forEach(button => {
          const active = button.dataset.colorStyle === nextStyle;
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', String(active));
        });
        applyPalette(state.palette);
        if ($('#themeBackdrop')?.classList.contains('open')) renderThemePanel();
        if (persist) {
          localStorage.setItem(COLOR_STYLE_KEY, nextStyle);
          const styleName = nextStyle === 'dark' ? '深色' : nextStyle === 'solid' ? '浅色' : '渐变';
          showToast(`已切换为${styleName}风格`);
        }
      }

      function applyPalette(id, persist=false) {
        const p = palettes.find(item => item.id === id) || palettes[0];
        const root = document.documentElement;
        const map = {
          pageBg1:'--page-bg-1', pageBg2:'--page-bg-2', paper:'--paper', ink:'--ink', muted:'--muted',
          primary:'--primary', primaryStrong:'--primary-strong', secondary:'--secondary', accent:'--accent',
          line:'--line', soft:'--soft', shadow:'--shadow'
        };
        Object.entries(p.vars).forEach(([key, value]) => root.style.setProperty(map[key], value));
        state.palette = p.id;
        updateThemeCurrentButton();
        if ($('#themeBackdrop')?.classList.contains('open')) renderThemePanel();
        if (persist) {
          saveState();
          showToast(`已切换：${p.name}`);
        }
      }

      window.amoristRepoThemeBridge = {
        getThemes() {
          const pack = (style, groups, rows) => ({ style, groups: groups.map(group => ({ name: group.name, items: group.ids.map(id => rows.find(item => item.id === id)).filter(Boolean).map(item => ({ id:item.id, name:item.name, vars:{...item.vars} })) })) });
          return [pack('gradient', richThemeGroups, richPalettes), pack('solid', editorialThemeGroups, editorialPalettes), pack('dark', darkThemeGroups, darkPalettes)];
        },
        apply(style, id) {
          applyColorStyle(style, false);
          applyPalette(id, true);
          const row = palettes.find(item => item.id === id);
          return row ? { id:row.id, name:row.name, vars:{...row.vars} } : null;
        }
      };

      function renderRatings() {
        const wrap = $('#ratings');
        wrap.innerHTML = '';
        ratingNames.forEach(name => {
          const row = document.createElement('div');
          row.className = `rating-row${name === '总体' ? ' overall' : ''}`;
          row.dataset.rating = name;

          const label = document.createElement('span');
          label.className = 'rating-label';
          label.textContent = name;

          const stars = document.createElement('div');
          stars.className = 'stars';
          for (let i = 1; i <= 5; i++) {
            const star = document.createElement('button');
            star.type = 'button';
            star.className = 'star';
            star.textContent = '★';
            star.dataset.value = i;
            star.setAttribute('aria-label', `${name} ${i} 星`);
            star.addEventListener('click', () => {
              state.ratings[name] = state.ratings[name] === i ? 0 : i;
              updateRating(name);
              saveState();
            });
            stars.appendChild(star);
          }
          row.append(label, stars);
          wrap.appendChild(row);
        });
      }

      function updateRating(name) {
        const value = Number(state.ratings[name] || 0);
        $$(`[data-rating="${CSS.escape(name)}"] .star`).forEach((star, index) => star.classList.toggle('on', index < value));
      }

      function setCompletion(value, persist=false) {
        state.completion = value;
        $$('#completionToggle button').forEach(btn => btn.classList.toggle('active', btn.dataset.value === value));
        if (persist) saveState();
      }

      function setChoice(group, value, persist=false) {
        state[group] = value;
        const id = group === 'platform' ? '#platformChoices' : '#languageChoices';
        $$(`${id} .choice-pill`).forEach(btn => btn.classList.toggle('active', btn.dataset.value === value));
        if (persist) saveState();
      }

      function normalizeTransform(target, value) {
        const fallback = defaultImageTransform(target);
        return {
          x:Math.max(0, Math.min(100, Number(value?.x ?? fallback.x))),
          y:Math.max(0, Math.min(100, Number(value?.y ?? fallback.y))),
          scale:Math.max(1, Math.min(3, Number(value?.scale ?? fallback.scale)))
        };
      }

      function applyImageTransform(target) {
        const config = imageTargets[target];
        const img = document.getElementById(config.img);
        if (!img) return;
        const transform = normalizeTransform(target, state.imageTransforms?.[target]);
        if (!state.imageTransforms) state.imageTransforms = emptyImageTransforms();
        state.imageTransforms[target] = transform;
        img.style.objectPosition = `${transform.x}% ${transform.y}%`;
        img.style.transform = `scale(${transform.scale})`;
        img.style.transformOrigin = `${transform.x}% ${transform.y}%`;
      }

      function setImage(target, src, name='', persist=true, resetCrop=false, preferredTransform=null) {
        const config = imageTargets[target];
        const img = document.getElementById(config.img);
        const changed = src !== (state.images?.[target] || '');
        if (!state.images) state.images = emptyImages();
        if (!state.imageTransforms) state.imageTransforms = emptyImageTransforms();
        if (preferredTransform) state.imageTransforms[target] = normalizeTransform(target, preferredTransform);
        else if (resetCrop || changed) state.imageTransforms[target] = defaultImageTransform(target);
        img.referrerPolicy = 'no-referrer';
        img.dataset.originalSrc = src || '';
        img.dataset.fallbackTried = '';
        img.onerror = () => {
          const original = img.dataset.originalSrc || '';
          if (/^https?:\/\//i.test(original) && !img.dataset.fallbackTried) {
            img.dataset.fallbackTried = '1';
            img.src = proxyUrls(original)[0];
            return;
          }
          img.closest('.image-tile').classList.remove('has-image');
        };
        img.onload = () => { img.closest('.image-tile').classList.toggle('has-image', Boolean(src)); applyImageTransform(target); };
        img.src = src || '';
        img.closest('.image-tile').classList.toggle('has-image', Boolean(src));
        state.images[target] = src || '';
        applyImageTransform(target);
        if (name && config.name) document.getElementById(config.name).value = name;
        if (persist) saveState();
      }

      function createArchiveId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
        return `archive-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }

      function openArchiveDb() {
        if (archiveDbPromise) return archiveDbPromise;
        archiveDbPromise = new Promise(resolve => {
          if (!('indexedDB' in window)) { resolve(null); return; }
          try {
            const request = indexedDB.open(ARCHIVE_DB_NAME, 2);
            request.onupgradeneeded = () => {
              const db = request.result;
              if (!db.objectStoreNames.contains(ARCHIVE_STORE_NAME)) {
                const store = db.createObjectStore(ARCHIVE_STORE_NAME, { keyPath:'id' });
                store.createIndex('updatedAt', 'updatedAt');
              }
              if (!db.objectStoreNames.contains(IMAGE_LIBRARY_STORE_NAME)) {
                const store = db.createObjectStore(IMAGE_LIBRARY_STORE_NAME, { keyPath:'id' });
                store.createIndex('lastUsedAt', 'lastUsedAt');
              }
              if (!db.objectStoreNames.contains(TRASH_STORE_NAME)) {
                const store = db.createObjectStore(TRASH_STORE_NAME, { keyPath:'id' });
                store.createIndex('deletedAt', 'deletedAt');
              }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
            request.onblocked = () => resolve(null);
          } catch (error) { resolve(null); }
        });
        return archiveDbPromise;
      }

      function readArchiveFallback() {
        try { return JSON.parse(localStorage.getItem(ARCHIVE_FALLBACK_KEY) || '[]'); }
        catch (error) { return []; }
      }

      function writeArchiveFallback(records) {
        localStorage.setItem(ARCHIVE_FALLBACK_KEY, JSON.stringify(records));
      }

      async function archiveGetAll() {
        const db = await openArchiveDb();
        if (!db) return readArchiveFallback();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(ARCHIVE_STORE_NAME, 'readonly');
          const request = tx.objectStore(ARCHIVE_STORE_NAME).getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }).catch(() => readArchiveFallback());
      }

      async function archiveGet(id) {
        if (!id) return null;
        const db = await openArchiveDb();
        if (!db) return readArchiveFallback().find(item => item.id === id) || null;
        return new Promise((resolve, reject) => {
          const tx = db.transaction(ARCHIVE_STORE_NAME, 'readonly');
          const request = tx.objectStore(ARCHIVE_STORE_NAME).get(id);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        }).catch(() => readArchiveFallback().find(item => item.id === id) || null);
      }

      async function archivePut(record) {
        const db = await openArchiveDb();
        if (!db) {
          const records = readArchiveFallback();
          const index = records.findIndex(item => item.id === record.id);
          if (index >= 0) records[index] = record; else records.push(record);
          writeArchiveFallback(records);
          return record;
        }
        return new Promise((resolve, reject) => {
          const tx = db.transaction(ARCHIVE_STORE_NAME, 'readwrite');
          tx.objectStore(ARCHIVE_STORE_NAME).put(record);
          tx.oncomplete = () => resolve(record);
          tx.onerror = () => reject(tx.error);
        });
      }

      async function archiveDelete(id) {
        const db = await openArchiveDb();
        if (!db) {
          writeArchiveFallback(readArchiveFallback().filter(item => item.id !== id));
          return;
        }
        return new Promise((resolve, reject) => {
          const tx = db.transaction(ARCHIVE_STORE_NAME, 'readwrite');
          tx.objectStore(ARCHIVE_STORE_NAME).delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      function readFallbackStore(key) {
        try { const rows = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(rows) ? rows : []; }
        catch (error) { return []; }
      }
      function writeFallbackStore(key, rows) { localStorage.setItem(key, JSON.stringify(rows)); }
      async function storeGetAll(storeName, fallbackKey) {
        const db = await openArchiveDb();
        if (!db || !db.objectStoreNames.contains(storeName)) return readFallbackStore(fallbackKey);
        return new Promise((resolve,reject) => {
          const request = db.transaction(storeName,'readonly').objectStore(storeName).getAll();
          request.onsuccess = () => resolve(request.result || []); request.onerror = () => reject(request.error);
        }).catch(() => readFallbackStore(fallbackKey));
      }
      async function storePut(storeName, fallbackKey, record) {
        const db = await openArchiveDb();
        if (!db || !db.objectStoreNames.contains(storeName)) {
          const rows = readFallbackStore(fallbackKey); const index = rows.findIndex(item => item.id === record.id);
          if (index >= 0) rows[index] = record; else rows.push(record); writeFallbackStore(fallbackKey, rows); return record;
        }
        return new Promise((resolve,reject) => {
          const tx = db.transaction(storeName,'readwrite'); tx.objectStore(storeName).put(record);
          tx.oncomplete = () => resolve(record); tx.onerror = () => reject(tx.error);
        });
      }
      async function storeDelete(storeName, fallbackKey, id) {
        const db = await openArchiveDb();
        if (!db || !db.objectStoreNames.contains(storeName)) { writeFallbackStore(fallbackKey, readFallbackStore(fallbackKey).filter(item => item.id !== id)); return; }
        return new Promise((resolve,reject) => {
          const tx = db.transaction(storeName,'readwrite'); tx.objectStore(storeName).delete(id);
          tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
        });
      }
      const imageLibraryGetAll = () => storeGetAll(IMAGE_LIBRARY_STORE_NAME, IMAGE_LIBRARY_FALLBACK_KEY);
      const imageLibraryPut = record => storePut(IMAGE_LIBRARY_STORE_NAME, IMAGE_LIBRARY_FALLBACK_KEY, record);
      const imageLibraryDelete = id => storeDelete(IMAGE_LIBRARY_STORE_NAME, IMAGE_LIBRARY_FALLBACK_KEY, id);
      const trashGetAll = () => storeGetAll(TRASH_STORE_NAME, TRASH_FALLBACK_KEY);
      const trashPut = record => storePut(TRASH_STORE_NAME, TRASH_FALLBACK_KEY, record);
      const trashDelete = id => storeDelete(TRASH_STORE_NAME, TRASH_FALLBACK_KEY, id);

      function createImageId() { return `image-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
      async function addImageToLibrary(src, name='', kind='', source='本地') {
        if (!src) return;
        const existing = cachedImageLibrary.find(item => item.src === src);
        const now = Date.now();
        const record = existing ? { ...existing, name:name || existing.name, kind:kind || existing.kind, source:source || existing.source, lastUsedAt:now } : {
          id:createImageId(), src, name:name || (kind === 'vn' ? '未命名作品' : '未命名角色'), kind:kind || 'character', source, createdAt:now, lastUsedAt:now
        };
        try { await imageLibraryPut(record); await refreshImageLibrary(); }
        catch (error) { console.warn('图片库保存失败', error); }
      }

      async function persistImageCropToLibrary(target=currentTarget) {
        const src = state.images?.[target];
        if (!src) return;
        const existing = cachedImageLibrary.find(item => item.src === src);
        if (!existing) return;
        const crop = normalizeTransform(target, state.imageTransforms?.[target]);
        try {
          await imageLibraryPut({ ...existing, crop, lastUsedAt:Date.now() });
          await refreshImageLibrary();
        } catch (error) { console.warn('图片裁剪保存失败', error); }
      }

      async function refreshImageLibrary() {
        try { cachedImageLibrary = await imageLibraryGetAll(); }
        catch (error) { cachedImageLibrary = []; }
        renderImageLibrary($('#librarySearch')?.value || '');
      }

      function renderImageLibrary(filter='') {
        const grid = $('#imageLibraryGrid'); if (!grid) return;
        const kind = imageTargets[currentTarget]?.kind || 'character';
        const keyword = String(filter || '').trim().toLowerCase();
        const rows = cachedImageLibrary.filter(item => item.kind === kind && (!keyword || `${item.name} ${item.source}`.toLowerCase().includes(keyword))).sort((a,b)=>(b.lastUsedAt||0)-(a.lastUsedAt||0));
        $('#libraryCount').textContent = `${rows.length} 张`;
        grid.innerHTML = '';
        if (!rows.length) { grid.innerHTML = `<div class="empty-results">${keyword ? '没有匹配的图片。' : '图片库还是空的。'}</div>`; return; }
        rows.forEach(item => {
          const card = document.createElement('div'); card.className=`library-card ${item.kind === 'vn' ? 'vn' : 'character'}`; card.tabIndex=0; card.setAttribute('role','button');
          const img = document.createElement('img'); img.src=item.src; img.referrerPolicy='no-referrer'; img.alt=item.name || '图片'; img.loading='lazy'; img.decoding='async';
          img.onerror=()=>{ const fallback=/^https?:\/\//i.test(item.src)?proxyUrls(item.src)[0]:''; if(fallback && img.src!==fallback) img.src=fallback; };
          const info=document.createElement('div'); info.className='library-card-info'; info.innerHTML=`<div class="library-card-name">${escapeHtml(item.name||'未命名')}</div>`;
          const del=document.createElement('button'); del.type='button'; del.className='library-delete'; del.textContent='×'; del.title='从图片库删除';
          del.addEventListener('click', async event => { event.preventDefault(); event.stopPropagation(); await imageLibraryDelete(item.id); await refreshImageLibrary(); showToast('已从图片库移除'); });
          const useLibraryImage=async()=>{ setImage(currentTarget,item.src,item.name,true,false,item.crop||null); await addImageToLibrary(item.src,item.name,item.kind,item.source); continueToCrop('已选择图片，可调整取景后完成'); }; card.addEventListener('click',useLibraryImage); card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();useLibraryImage();}});
          card.append(img,info,del); grid.appendChild(card);
        });
      }

      function migrateSnapshot(snapshot={}) {
        const result = { ...snapshot };
        result.palette = palettes.some(p => p.id === result.palette) ? result.palette : 'mintLavender';
        result.completion = result.completion === 'no' ? 'no' : 'yes';
        result.platform = result.platform || '';
        result.language = result.language || '';
        result.ratings = { ...Object.fromEntries(ratingNames.map(name => [name,0])), ...(result.ratings || {}) };
        result.images = { ...emptyImages(), ...(result.images || {}) };
        const transforms = emptyImageTransforms();
        Object.keys(transforms).forEach(target => transforms[target] = normalizeTransform(target, result.imageTransforms?.[target]));
        result.imageTransforms = transforms;
        result.fields = { ...(result.fields || {}) };
        const pageKeys = Object.keys(result.fields).map(key => key.match(/^longRepo(?:Title|PageNumber|Subject|Keywords|Text)-(\d+)$/)?.[1]).filter(Boolean).map(Number);
        result.longPageCount = Math.max(0, Number(result.longPageCount) || 0, ...(pageKeys.length ? pageKeys : [0]));
        result.schemaVersion = BACKUP_VERSION;
        return result;
      }

      function makeSnapshot() {
        return {
          schemaVersion:BACKUP_VERSION,
          palette:state.palette,
          completion:state.completion,
          platform:state.platform,
          language:state.language,
          ratings:{ ...state.ratings },
          images:{ ...state.images },
          imageTransforms:JSON.parse(JSON.stringify(state.imageTransforms || emptyImageTransforms())),
          longPageCount:longRepoPages().length,
          fields:collectFields()
        };
      }

      function archiveDisplayTitle(snapshot=makeSnapshot()) {
        return String(snapshot.fields?.gameName || snapshot.fields?.workTitle || '未命名存档').trim() || '未命名存档';
      }

      function archiveMeta(record) {
        const snapshot = record.snapshot || {};
        const completion = snapshot.completion === 'yes' ? '已全通' : '未全通';
        const time = snapshot.fields?.playTime || '时长未填';
        return `${completion} · ${time}`;
      }

      function formatArchiveTime(timestamp) {
        if (!timestamp) return '时间未知';
        const date = new Date(timestamp);
        const now = new Date();
        const sameYear = date.getFullYear() === now.getFullYear();
        return new Intl.DateTimeFormat('zh-CN', {
          year:sameYear ? undefined : 'numeric', month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'
        }).format(date);
      }

      function formatClock(timestamp=Date.now()) {
        return new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit'}).format(new Date(timestamp));
      }
      function updateSaveStatus() {
        const repoLabel = window.amoristRepoManager?.label?.();
        const current = cachedArchives.find(item => item.id === currentArchiveId);
        const status = $('#saveStatus'); if (!status) return;
        status.textContent = repoLabel ? `${repoLabel} · 已自动保存 ${formatClock(lastSavedAt)}` : (current ? `正在编辑：${current.title} · 已自动保存 ${formatClock(lastSavedAt)}` : `当前为临时草稿 · 已自动保存 ${formatClock(lastSavedAt)}`);
      }
      function updateArchiveCurrentLabel() {
        const current = cachedArchives.find(item => item.id === currentArchiveId);
        const box = $('#archiveCurrent');
        if (box) box.innerHTML = current ? `当前：<strong>${escapeHtml(current.title)}</strong><br>修改会自动保存到这条存档。` : '当前：<strong>自动草稿</strong><br>未加入列表，页面仍会自动恢复。';
        updateSaveStatus();
      }

      function renderArchiveList(filter='') {
        const list = $('#archiveList'); if (!list) return;
        const keyword = String(filter || '').trim().toLowerCase();
        const sourceRows = archiveView === 'trash' ? cachedTrash : cachedArchives;
        const rows = sourceRows.filter(record => {
          if (!keyword) return true;
          const snapshot = record.snapshot || {};
          return `${record.title || ''} ${snapshot.fields?.fillerName || ''}`.toLowerCase().includes(keyword);
        }).sort((a,b) => archiveView === 'trash' ? (b.deletedAt||0)-(a.deletedAt||0) : (b.updatedAt||0)-(a.updatedAt||0));
        list.innerHTML = '';
        if (!rows.length) {
          list.innerHTML = `<div class="archive-empty">${keyword ? '没有匹配的记录。' : (archiveView === 'trash' ? '最近删除为空。删除的存档会在这里保留 7 天。' : '还没有正式存档。<br>填写到任意阶段后，点击“保存当前”即可加入列表。')}</div>`;
          return;
        }
        rows.forEach(record => {
          const snapshot = migrateSnapshot(record.snapshot || {});
          const card = document.createElement('article'); card.className = `archive-card${record.id === currentArchiveId ? ' current' : ''}${archiveView === 'trash' ? ' trash' : ''}`;
          const cover = document.createElement('div'); cover.className='archive-cover'; const src=snapshot.images?.cover||'';
          if(src){ const img=document.createElement('img'); img.src=src; img.referrerPolicy='no-referrer'; img.alt=record.title||'作品封面'; img.onerror=()=>{cover.textContent='封面';img.remove();}; cover.appendChild(img); } else cover.textContent='无封面';
          const info=document.createElement('div'); info.className='archive-info';
          const timeText = archiveView === 'trash' ? `删除于 ${formatArchiveTime(record.deletedAt)}` : formatArchiveTime(record.updatedAt);
          info.innerHTML=`<div class="archive-title">${escapeHtml(record.title||'未命名存档')}</div><div class="archive-meta">${escapeHtml(archiveMeta(record))}<br>${escapeHtml(timeText)}</div>`;
          const actions=document.createElement('div'); actions.className='archive-actions';
          if(archiveView==='trash'){
            const restore=document.createElement('button'); restore.type='button'; restore.className='archive-mini-btn restore'; restore.textContent='恢复'; restore.addEventListener('click',()=>restoreArchiveRecord(record.id));
            const permanent=document.createElement('button'); permanent.type='button'; permanent.className='archive-mini-btn permanent'; permanent.textContent='彻底删除'; permanent.addEventListener('click',()=>permanentlyDeleteArchive(record.id));
            actions.append(restore,permanent);
          }else{
            const open=document.createElement('button'); open.type='button'; open.className='archive-mini-btn open'; open.textContent=record.id===currentArchiveId?'编辑中':'打开'; open.addEventListener('click',()=>loadArchiveRecord(record.id));
            const copy=document.createElement('button'); copy.type='button'; copy.className='archive-mini-btn'; copy.textContent='复制'; copy.addEventListener('click',()=>duplicateArchiveRecord(record.id));
            const del=document.createElement('button'); del.type='button'; del.className='archive-mini-btn delete'; del.textContent='删除'; del.addEventListener('click',()=>deleteArchiveRecord(record.id));
            actions.append(open,copy,del);
          }
          card.append(cover,info,actions); list.appendChild(card);
        });
      }

      async function purgeExpiredTrash() {
        const cutoff = Date.now() - 7*24*60*60*1000;
        const rows = await trashGetAll();
        await Promise.all(rows.filter(item => Number(item.deletedAt||0) < cutoff).map(item => trashDelete(item.id)));
      }

      async function refreshArchiveLibrary() {
        try {
          await purgeExpiredTrash();
          [cachedArchives,cachedTrash] = await Promise.all([archiveGetAll(),trashGetAll()]);
        } catch (error) { cachedArchives=[]; cachedTrash=[]; console.warn('读取存档失败',error); }
        if (currentArchiveId && !cachedArchives.some(item => item.id === currentArchiveId)) { currentArchiveId=''; localStorage.removeItem(CURRENT_ARCHIVE_KEY); }
        $('#archiveCount').textContent=String(cachedArchives.length);
        $('#trashCount').textContent=String(cachedTrash.length);
        updateArchiveCurrentLabel();
        renderArchiveList($('#archiveSearch')?.value||'');
      }

      async function saveCurrentArchive({ silent=false, asCopy=false }={}) {
        const snapshot = makeSnapshot();
        let id = asCopy ? '' : currentArchiveId;
        let existing = id ? await archiveGet(id) : null;
        if (!id || !existing) id = createArchiveId();
        const now = Date.now();
        const title = archiveDisplayTitle(snapshot);
        const record = {
          id,
          title: asCopy ? `${title}（副本）` : title,
          createdAt:existing?.createdAt || now,
          updatedAt:now,
          snapshot
        };
        try {
          await archivePut(record);
          currentArchiveId = id;
          localStorage.setItem(CURRENT_ARCHIVE_KEY, id);
          lastSavedAt=Date.now();
          await refreshArchiveLibrary();
          if (!silent) showToast(existing && !asCopy ? '存档已更新' : '已保存到存档列表');
          return record;
        } catch (error) {
          console.error(error);
          if (!silent) alert('保存存档失败。当前浏览器可能限制本地存储，或存储空间不足。可以先导出备份。');
          throw error;
        }
      }

      function scheduleArchiveAutosave() {
        if (!currentArchiveId) return;
        clearTimeout(archiveAutosaveTimer);
        archiveAutosaveTimer = setTimeout(() => saveCurrentArchive({ silent:true }).catch(() => {}), 650);
      }

      function applySnapshot(snapshot) {
        const migrated = migrateSnapshot(snapshot || {});
        ensureLongRepoPages(migrated.longPageCount);
        state = { ...migrated };
        $$('.persist').forEach(el => el.value = '');
        $('#workTitle').value = '乙女游戏 REPO';
        longRepoPages().forEach((card,index) => {
          card.querySelector('.long-repo-title').value = '标题';
          card.querySelector('.long-repo-page-number').value = String(index + 1).padStart(2,'0');
        });
        Object.entries(migrated.fields || {}).forEach(([key,value]) => { const field=document.querySelector(`[data-key="${CSS.escape(key)}"]`); if(field) field.value=value??''; });
        renderPageSwitch(); renderState(); fitAllAdaptiveText(); updateLongRepoCount();
        if (!window.AMORIST_REPO_READONLY_LOADING) saveState();
      }

      async function loadArchiveRecord(id) {
        if (currentArchiveId && currentArchiveId !== id) {
          await saveCurrentArchive({ silent:true }).catch(() => {});
        }
        const record = await archiveGet(id);
        if (!record) { showToast('没有找到这条存档'); await refreshArchiveLibrary(); return; }
        currentArchiveId = id;
        localStorage.setItem(CURRENT_ARCHIVE_KEY, id);
        applySnapshot(record.snapshot || {});
        await refreshArchiveLibrary();
        closeArchivePanel();
        showToast(`已打开：${record.title}`);
      }

      async function duplicateArchiveRecord(id) {
        const record = await archiveGet(id);
        if (!record) return;
        const now = Date.now();
        const duplicate = {
          ...record,
          id:createArchiveId(),
          title:`${record.title || '未命名存档'}（副本）`,
          createdAt:now,
          updatedAt:now,
          snapshot:JSON.parse(JSON.stringify(record.snapshot || {}))
        };
        try {
          await archivePut(duplicate);
          await refreshArchiveLibrary();
          showToast('已复制一份存档');
        } catch (error) { alert('复制失败，可能是本地存储空间不足。'); }
      }

      async function deleteArchiveRecord(id) {
        const record = cachedArchives.find(item => item.id === id);
        if (!record || !confirm(`将“${record.title || '这条存档'}”移到最近删除吗？7 天内可以恢复。`)) return;
        await trashPut({ ...record, deletedAt:Date.now() });
        await archiveDelete(id);
        if(currentArchiveId===id){ currentArchiveId=''; localStorage.removeItem(CURRENT_ARCHIVE_KEY); }
        await refreshArchiveLibrary(); showToast('已移到最近删除');
      }
      async function restoreArchiveRecord(id) {
        const record=cachedTrash.find(item=>item.id===id); if(!record) return;
        const {deletedAt,...rest}=record; rest.updatedAt=Date.now(); await archivePut(rest); await trashDelete(id); await refreshArchiveLibrary(); showToast('存档已恢复');
      }
      async function permanentlyDeleteArchive(id) {
        const record=cachedTrash.find(item=>item.id===id); if(!confirm(`彻底删除“${record?.title||'这条存档'}”吗？此操作无法恢复。`)) return;
        await trashDelete(id); await refreshArchiveLibrary(); showToast('已彻底删除');
      }

      function openArchivePanel() {
        $('#archiveBackdrop').classList.add('open');
        refreshArchiveLibrary();
      }

      function closeArchivePanel() { $('#archiveBackdrop').classList.remove('open'); }

      async function startNewBlank() {
        if (!confirm('新建一张空白表格吗？当前内容会保留在自动草稿；若已正式存档，也会先自动更新。')) return;
        if (currentArchiveId) await saveCurrentArchive({ silent:true }).catch(() => {});
        currentArchiveId = '';
        localStorage.removeItem(CURRENT_ARCHIVE_KEY);
        clearFormWithoutConfirm();
        await refreshArchiveLibrary();
        closeArchivePanel();
        showToast('已新建空白表格');
      }

      async function exportAllArchives() {
        const [archives,trash,imageLibrary] = await Promise.all([archiveGetAll(),trashGetAll(),imageLibraryGetAll()]);
        const payload = {
          type:'otome-repo-complete-backup', version:BACKUP_VERSION, exportedAt:new Date().toISOString(),
          archives, trash, imageLibrary, draft:makeSnapshot(), currentArchiveId,
          themeFavorites:themeFavorites()
        };
        const blob=new Blob([JSON.stringify(payload)],{type:'application/json;charset=utf-8'}); const url=URL.createObjectURL(blob); const link=document.createElement('a');
        link.href=url; link.download=`乙女游戏REPO完整备份_${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1200);
        showToast(`已备份 ${archives.length} 条存档和 ${imageLibrary.length} 张图片`);
      }

      async function importArchiveBackup(file) {
        const payload=JSON.parse(await file.text());
        const rows=Array.isArray(payload)?payload:(Array.isArray(payload?.archives)?payload.archives:[]);
        if(!rows.length && !payload?.draft && !Array.isArray(payload?.imageLibrary)) throw new Error('备份格式不正确');
        let imported=0; const idMap={};
        for(const source of rows){
          if(!source?.snapshot) continue;
          const exists=source.id?await archiveGet(source.id):null;
          const targetId=exists?createArchiveId():(source.id||createArchiveId());
          if(source.id) idMap[source.id]=targetId;
          const snapshot=migrateSnapshot(source.snapshot);
          const record={ id:targetId, title:String(source.title||archiveDisplayTitle(snapshot)), createdAt:Number(source.createdAt)||Date.now(), updatedAt:Number(source.updatedAt)||Date.now(), snapshot };
          await archivePut(record); imported++;
        }
        for(const source of (payload?.trash||[])){ if(!source?.snapshot) continue; const targetId=source.id&&idMap[source.id]?idMap[source.id]:(source.id||createArchiveId()); await trashPut({ ...source, id:targetId, snapshot:migrateSnapshot(source.snapshot), deletedAt:Number(source.deletedAt)||Date.now() }); }
        for(const image of (payload?.imageLibrary||[])){ if(!image?.src) continue; const existing=cachedImageLibrary.find(item=>item.src===image.src); await imageLibraryPut({ ...image, id:existing?.id||image.id||createImageId(), lastUsedAt:Number(image.lastUsedAt)||Date.now() }); }
        if(Array.isArray(payload?.themeFavorites)) localStorage.setItem(THEME_FAVORITES_KEY,JSON.stringify(payload.themeFavorites));
        const restoredCurrent=payload?.currentArchiveId?(idMap[payload.currentArchiveId]||payload.currentArchiveId):'';
        if(restoredCurrent && await archiveGet(restoredCurrent)){ currentArchiveId=restoredCurrent; localStorage.setItem(CURRENT_ARCHIVE_KEY,restoredCurrent); }
        else { currentArchiveId=''; localStorage.removeItem(CURRENT_ARCHIVE_KEY); }
        if(payload?.draft){ const draft=migrateSnapshot(payload.draft); localStorage.setItem(STORAGE_KEY,JSON.stringify(draft)); applySnapshot(draft); }
        await Promise.all([refreshArchiveLibrary(),refreshImageLibrary()]);
        showToast(`已导入 ${imported} 条存档，图片库和裁切信息已恢复`);
      }

      function collectFields() {
        const fields = {};
        $$('.persist').forEach(el => fields[el.dataset.key] = el.value);
        return fields;
      }

      let stateSaveTimer = 0;
      let stateSaveUsesIdle = false;
      function cancelScheduledStateSave() {
        if (!stateSaveTimer) return;
        if (stateSaveUsesIdle && window.cancelIdleCallback) cancelIdleCallback(stateSaveTimer);
        else clearTimeout(stateSaveTimer);
        stateSaveTimer=0;stateSaveUsesIdle=false;
      }
      function commitState() {
        const payload = makeSnapshot();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); lastSavedAt=Date.now(); updateSaveStatus(); }
        catch (error) { console.warn('保存失败', error); }
        scheduleArchiveAutosave();
      }
      function saveState(immediate=false) {
        cancelScheduledStateSave();
        if (immediate) { commitState(); return; }
        const commit=()=>{stateSaveTimer=0;stateSaveUsesIdle=false;commitState();};
        if(window.requestIdleCallback){stateSaveUsesIdle=true;stateSaveTimer=requestIdleCallback(commit,{timeout:900});}
        else stateSaveTimer=setTimeout(commit,280);
      }

      function loadState() {
        try {
          const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); if(!saved) return;
          const migrated=migrateSnapshot(saved); ensureLongRepoPages(migrated.longPageCount); state={...migrated};
          Object.entries(migrated.fields||{}).forEach(([key,value])=>{const field=document.querySelector(`[data-key="${CSS.escape(key)}"]`);if(field)field.value=value??'';});
          renderPageSwitch();
        } catch(error){ console.warn('读取失败',error); }
      }

      function renderState() {
        applyPalette(state.palette); setCompletion(state.completion); setChoice('platform',state.platform||''); setChoice('language',state.language||''); ratingNames.forEach(updateRating);
        Object.entries(state.images||{}).forEach(([target,src])=>setImage(target,src,'',false,false));
        Object.keys(imageTargets).forEach(applyImageTransform);
      }

      function clearFormWithoutConfirm() {
        localStorage.removeItem(STORAGE_KEY);
        longRepoPages().slice(1).forEach(card => card.remove());
        renderPageSwitch();
        $$('.persist').forEach(el => el.value = '');
        $('#workTitle').value = '乙女游戏 REPO';
        $('#longRepoTitle').value = '标题';
        $('#longRepoPageNumber').value = '01';
        state = {
          palette:'mintLavender', completion:'yes', platform:'', language:'',
          ratings:Object.fromEntries(ratingNames.map(name => [name, 0])),
          images:emptyImages(), imageTransforms:emptyImageTransforms()
        };
        renderState();
        fitAllAdaptiveText();
        updateLongRepoCount($('#longRepoCard'));
        saveState();
      }

      function resetAll() {
        if (!confirm('确定清空当前表格吗？已经加入存档列表的版本会保留。')) return;
        currentArchiveId = '';
        localStorage.removeItem(CURRENT_ARCHIVE_KEY);
        clearFormWithoutConfirm();
        refreshArchiveLibrary();
        showToast('已清空表格，原存档仍保留');
      }

      function activateImageTab(name) {
        $$('#imageModal .tab-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===name));
        $$('#imageModal .tab-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===name));
        const tabStrip=$('#imageModal .image-tabs');
        const activeTab=$(`#imageModal .tab-btn[data-tab="${name}"]`);
        if(tabStrip&&activeTab) requestAnimationFrame(()=>{
          if(name==='search'){ tabStrip.scrollLeft=0; return; }
          const visibleStart=tabStrip.scrollLeft;
          const visibleEnd=visibleStart+tabStrip.clientWidth;
          const tabStart=activeTab.offsetLeft;
          const tabEnd=tabStart+activeTab.offsetWidth;
          if(tabStart<visibleStart) tabStrip.scrollLeft=tabStart;
          else if(tabEnd>visibleEnd) tabStrip.scrollLeft=tabEnd-tabStrip.clientWidth;
        });
        $('#modalStatus').textContent='';
        if(name==='library') renderImageLibrary($('#librarySearch')?.value||'');
        if(name==='crop') syncCropPanel();
      }

      function syncCropPanel() {
        const src=state.images?.[currentTarget]||''; const preview=$('#cropPreviewImg'); const frame=$('#cropFrame');
        const transform=normalizeTransform(currentTarget,state.imageTransforms?.[currentTarget]);
        const targetImage=document.getElementById(imageTargets[currentTarget].img); const targetTile=targetImage?.closest('.image-tile'); const targetRect=targetTile?.getBoundingClientRect();
        if(targetRect?.width>0&&targetRect?.height>0) frame.style.aspectRatio=`${targetRect.width} / ${targetRect.height}`;
        preview.referrerPolicy='no-referrer'; preview.dataset.originalSrc=src; preview.dataset.fallbackTried='';
        preview.onerror=()=>{ const original=preview.dataset.originalSrc||''; if(/^https?:\/\//i.test(original)&&!preview.dataset.fallbackTried){ preview.dataset.fallbackTried='1'; preview.src=proxyUrls(original)[0]; } };
        if(src) preview.src=src; else preview.removeAttribute('src');
        frame.classList.toggle('has-image',Boolean(src));
        preview.style.objectPosition=`${transform.x}% ${transform.y}%`; preview.style.transform=`scale(${transform.scale})`; preview.style.transformOrigin=`${transform.x}% ${transform.y}%`;
        $('#cropX').value=String(transform.x); $('#cropY').value=String(transform.y); $('#cropScale').value=String(transform.scale);
        $$('#cropX,#cropY,#cropScale').forEach(input=>input.disabled=!src);
        $('#resetCropBtn').disabled=!src; $('#finishCropBtn').disabled=!src;
      }

      function updateCropFromControls(persist=false) {
        if(!state.images?.[currentTarget]) return;
        state.imageTransforms[currentTarget]=normalizeTransform(currentTarget,{x:$('#cropX').value,y:$('#cropY').value,scale:$('#cropScale').value});
        applyImageTransform(currentTarget); syncCropPanel();
        if(persist) { saveState(); persistImageCropToLibrary(); }
      }

      function continueToCrop(message='') {
        activateImageTab('crop');
        syncCropPanel();
        $('#modalStatus').textContent=message;
      }

      function openImageModal(target) {
        currentTarget=target; const config=imageTargets[target]; $('#modalTitle').textContent=config.title;
        $('#searchInput').value=target==='cover'?$('#gameName').value:(config.name?document.getElementById(config.name).value:'');
        $('#searchResults').innerHTML='<div class="empty-results">输入关键词后开始搜索</div>'; $('#modalStatus').textContent='';
        $('#imageModal').classList.add('open'); refreshImageLibrary(); activateImageTab('search');
        setTimeout(()=>{ const active=$('#imageModal .tab-panel.active'); active?.querySelector('input:not([type=range])')?.focus(); },50);
      }

      function closeImageModal() { $('#imageModal').classList.remove('open'); }

      function escapeHtml(text='') {
        return String(text).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
      }

      function proxyUrls(url) {
        return [
          `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=jpg&q=90`,
          `https://corsproxy.io/?url=${encodeURIComponent(url)}`
        ];
      }

      async function fetchWithTimeout(url, options={}, timeout=16000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          return await fetch(url, { ...options, signal:controller.signal, cache:'no-store' });
        } finally {
          clearTimeout(timer);
        }
      }

      function blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      function loadImageSource(src) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('图片解码失败'));
          img.src = src;
        });
      }

      async function normalizeImageBlob(blob) {
        if (!blob.type.startsWith('image/')) throw new Error('返回内容不是图片');
        const objectUrl = URL.createObjectURL(blob);
        try {
          const img = await loadImageSource(objectUrl);
          const maxW = 1000;
          const maxH = 1400;
          const ratio = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
          const width = Math.max(1, Math.round(img.naturalWidth * ratio));
          const height = Math.max(1, Math.round(img.naturalHeight * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha:false });
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL('image/jpeg', .88);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }

      async function fetchImageData(url) {
        const attempts = [url, ...proxyUrls(url)];
        let lastError;
        for (const candidate of attempts) {
          try {
            const response = await fetchWithTimeout(candidate, { mode:'cors', referrerPolicy:'no-referrer' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await normalizeImageBlob(await response.blob());
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError || new Error('图片导入失败');
      }

      async function useRemoteImage(url, name='', source='') {
        const kind=imageTargets[currentTarget].kind;
        setImage(currentTarget,url,name,true,true);
        await addImageToLibrary(url,name,kind,source);
        continueToCrop('图片已加入本地图片库，可调整取景后完成');
      }

      async function requestJsonWithFallback(endpoint, options, label='接口') {
        const attempts = [endpoint, `https://corsproxy.io/?url=${encodeURIComponent(endpoint)}`];
        let lastError;
        for (const url of attempts) {
          try {
            const response = await fetchWithTimeout(url, options, 18000);
            if (!response.ok) throw new Error(`${label} ${response.status}`);
            return await response.json();
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError || new Error(`${label}搜索失败`);
      }

      async function requestVndb(endpoint, body) {
        return requestJsonWithFallback(endpoint, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(body)
        }, 'VNDB');
      }

      async function requestBangumi(endpoint, body) {
        return requestJsonWithFallback(endpoint, {
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'Accept':'application/json'
          },
          body:JSON.stringify(body)
        }, 'Bangumi');
      }

      function getBangumiImage(item) {
        const images = item?.images || {};
        return images.large || images.common || images.medium || images.grid || images.small || '';
      }

      function getInfoboxChineseName(item) {
        const rows = Array.isArray(item?.infobox) ? item.infobox : [];
        for (const row of rows) {
          const key = String(row?.key || '');
          if (!/(简体中文名|中文名|繁体中文名)/.test(key)) continue;
          const value = row?.value;
          if (typeof value === 'string') return value;
          if (Array.isArray(value)) {
            const first = value.find(entry => typeof entry === 'string' || entry?.v);
            if (typeof first === 'string') return first;
            if (first?.v) return first.v;
          }
        }
        return '';
      }

      function normalizeBangumiResults(data, kind) {
        const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.results) ? data.results : []);
        return rows.map(item => {
          const imageUrl = getBangumiImage(item);
          if (!imageUrl) return null;
          if (kind === 'vn') {
            const chineseName = item.name_cn || '';
            const originalName = item.name || '';
            return {
              imageUrl,
              name: chineseName || originalName || '未命名作品',
              sub: chineseName && originalName ? originalName : '游戏',
              source:''
            };
          }
          const chineseName = item.name_cn || getInfoboxChineseName(item);
          const originalName = item.name || '';
          return {
            imageUrl,
            name: chineseName || originalName || '未命名角色',
            sub: chineseName && originalName && chineseName !== originalName ? originalName : '角色',
            source:''
          };
        }).filter(Boolean);
      }

      function normalizeVndbResults(data, kind) {
        return (data.results || [])
          .filter(item => item.image?.url && Number(item.image?.sexual ?? 0) <= 1.25)
          .map(item => ({
            imageUrl: item.image.thumbnail || item.image.url,
            originalUrl: item.image.url,
            name: kind === 'vn' ? item.title : item.name,
            sub: kind === 'vn'
              ? (item.alttitle || 'Visual Novel')
              : (item.original || item.vns?.[0]?.title || 'Character'),
            source:''
          }));
      }

      async function searchBangumi(query, kind) {
        if (kind === 'vn') {
          const endpoint = 'https://api.bgm.tv/v0/search/subjects?limit=18&offset=0';
          const body = { keyword:query, sort:'match', filter:{ type:[4] } };
          return normalizeBangumiResults(await requestBangumi(endpoint, body), kind);
        }
        const endpoint = 'https://api.bgm.tv/v0/search/characters?limit=24&offset=0';
        const body = { keyword:query };
        return normalizeBangumiResults(await requestBangumi(endpoint, body), kind);
      }

      async function searchVndbItems(query, kind) {
        const endpoint = kind === 'vn' ? 'https://api.vndb.org/kana/vn' : 'https://api.vndb.org/kana/character';
        const body = kind === 'vn'
          ? { filters:['search','=',query], fields:'title,alttitle,image.url,image.thumbnail,image.sexual,image.violence', sort:'searchrank', results:16 }
          : { filters:['search','=',query], fields:'name,original,image.url,image.sexual,image.violence,vns.title', sort:'searchrank', results:20 };
        return normalizeVndbResults(await requestVndb(endpoint, body), kind);
      }

      function dedupeSearchItems(items) {
        const seen = new Set();
        return items.filter(item => {
          const key = `${String(item.name || '').toLowerCase()}|${item.imageUrl}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      function renderSearchItem(item, kind, resultsBox) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `result-card${kind === 'character' ? ' character-result' : ''}`;

        const img = document.createElement('img');
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.src = item.imageUrl;
        img.alt = item.name;
        img.onerror = () => {
          const fallback = proxyUrls(item.imageUrl)[0];
          if (img.src !== fallback) img.src = fallback;
        };

        const text = document.createElement('div');
        text.className = 'result-text';
        text.innerHTML = `<div class="result-name">${escapeHtml(item.name)}</div><div class="result-sub">${escapeHtml(item.sub || '')}</div>`;
        button.append(img, text);
        button.addEventListener('click', () => useRemoteImage(item.originalUrl || item.imageUrl, item.name));
        resultsBox.appendChild(button);
      }

      async function searchImages() {
        const query = $('#searchInput').value.trim();
        if (!query) { $('#modalStatus').textContent = '请先输入关键词。'; return; }
        const kind = imageTargets[currentTarget].kind;
        const resultsBox = $('#searchResults');
        resultsBox.innerHTML = '<div class="empty-results">正在搜索…</div>';
        $('#modalStatus').textContent = '';

        const hasChinese = /[\u3400-\u9fff]/.test(query);
        const [bangumiResult, vndbResult] = await Promise.allSettled([
          searchBangumi(query, kind),
          searchVndbItems(query, kind)
        ]);

        const bangumiItems = bangumiResult.status === 'fulfilled' ? bangumiResult.value : [];
        const vndbItems = vndbResult.status === 'fulfilled' ? vndbResult.value : [];
        const ordered = hasChinese
          ? [...bangumiItems, ...vndbItems]
          : [...vndbItems, ...bangumiItems];
        const items = dedupeSearchItems(ordered).slice(0, 24);

        resultsBox.innerHTML = '';
        if (!items.length) {
          const failures = [bangumiResult, vndbResult].filter(r => r.status === 'rejected').length;
          resultsBox.innerHTML = '<div class="empty-results">没有找到带图片的结果。可以尝试作品或角色的完整中文名、日文名、英文名，或使用本地上传。</div>';
          $('#modalStatus').textContent = '暂时没有找到结果，请换个关键词试试。';
          return;
        }

        items.forEach(item => renderSearchItem(item, kind, resultsBox));
        $('#modalStatus').textContent = `已找到 ${items.length} 个结果。`;
      }

      let currentExportBlob = null;
      let currentExportUrl = '';
      let currentExportFilename = '日乙repo.png';

      function hexToRgb(hex) {
        const value = hex.replace('#','').trim();
        const full = value.length === 3 ? value.split('').map(v => v+v).join('') : value;
        const n = parseInt(full, 16);
        return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
      }

      function rgba(hex, alpha) {
        const {r,g,b} = hexToRgb(hex);
        return `rgba(${r},${g},${b},${alpha})`;
      }

      function mix(a, b, amount=.5) {
        const x = hexToRgb(a), y = hexToRgb(b);
        const c = key => Math.round(x[key] * (1-amount) + y[key] * amount).toString(16).padStart(2,'0');
        return `#${c('r')}${c('g')}${c('b')}`;
      }

      function roundedPath(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w/2, h/2);
        ctx.beginPath();
        ctx.moveTo(x+radius, y);
        ctx.arcTo(x+w, y, x+w, y+h, radius);
        ctx.arcTo(x+w, y+h, x, y+h, radius);
        ctx.arcTo(x, y+h, x, y, radius);
        ctx.arcTo(x, y, x+w, y, radius);
        ctx.closePath();
      }

      function box(ctx, x, y, w, h, r, fill, stroke, line=1) {
        roundedPath(ctx, x, y, w, h, r);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.lineWidth = line; ctx.strokeStyle = stroke; ctx.stroke(); }
      }

      function drawCoverImage(ctx, img, x, y, w, h, r=12) {
        ctx.save();
        roundedPath(ctx, x, y, w, h, r);
        ctx.clip();
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, x + (w-dw)/2, y + (h-dh)/2, dw, dh);
        ctx.restore();
      }

      function setFont(ctx, size, weight=700) {
        ctx.font = `${weight} ${size}px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`;
      }

      function fitText(ctx, text, maxWidth) {
        let value = String(text || '');
        if (ctx.measureText(value).width <= maxWidth) return value;
        while (value.length > 1 && ctx.measureText(value + '…').width > maxWidth) value = value.slice(0,-1);
        return value + '…';
      }

      function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
        const chars = [...String(text || '')];
        const lines = [];
        let line = '';
        for (const ch of chars) {
          const test = line + ch;
          if (ch === '\n' || (line && ctx.measureText(test).width > maxWidth)) {
            lines.push(line);
            line = ch === '\n' ? '' : ch;
            if (lines.length >= maxLines) break;
          } else line = test;
        }
        if (lines.length < maxLines && line) lines.push(line);
        if (chars.length && lines.length === maxLines) {
          const joined = lines.join('');
          if (joined.length < chars.filter(c => c !== '\n').length) lines[maxLines-1] = fitText(ctx, lines[maxLines-1], maxWidth - 10) + '…';
        }
        lines.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
      }

      async function imageForCanvas(src) {
        if (!src) return null;
        try {
          const safeSource = /^https?:\/\//i.test(src) ? await fetchImageData(src) : src;
          return await loadImageSource(safeSource);
        }
        catch (error) { return null; }
      }

      function currentPalette() {
        return palettes.find(item => item.id === state.palette) || palettes[0];
      }

      function drawPill(ctx, text, x, y, active, colors, fontSize=9) {
        setFont(ctx, fontSize, 900);
        const w = Math.max(28, ctx.measureText(text).width + 14);
        box(ctx, x, y, w, 19, 10, active ? colors.primary : colors.soft, null);
        ctx.fillStyle = active ? '#ffffff' : colors.muted;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x+w/2, y+10);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        return w;
      }

      async function renderRepoCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_W;
        canvas.height = OUTPUT_H;
        const ctx = canvas.getContext('2d', { alpha:false });
        ctx.scale(2,2);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const colors = currentPalette().vars;

        // Card background and decoration
        ctx.fillStyle = colors.paper;
        ctx.fillRect(0,0,750,1000);
        const grad1 = ctx.createRadialGradient(680,-20,10,680,-20,170);
        grad1.addColorStop(0, rgba(colors.secondary,.42));
        grad1.addColorStop(1, rgba(colors.secondary,0));
        ctx.fillStyle = grad1; ctx.fillRect(500,0,250,230);
        const grad2 = ctx.createRadialGradient(30,960,10,30,960,180);
        grad2.addColorStop(0, rgba(colors.primary,.28));
        grad2.addColorStop(1, rgba(colors.primary,0));
        ctx.fillStyle = grad2; ctx.fillRect(0,780,260,220);
        ctx.fillStyle = rgba(colors.primary,.12);
        for (let yy=10; yy<1000; yy+=22) for (let xx=10; xx<750; xx+=22) { ctx.beginPath(); ctx.arc(xx,yy,1.25,0,Math.PI*2); ctx.fill(); }
        ctx.lineWidth = 2; ctx.strokeStyle = mix(colors.line, '#ffffff', .25); roundedPath(ctx,1,1,748,998,27); ctx.stroke();
        ctx.fillStyle = colors.accent; ctx.fillRect(28,0,104,4);

        // Header
        ctx.fillStyle = colors.accent; setFont(ctx,11,900); ctx.fillText('Omnia vincit Amor',28,39);
        ctx.fillStyle = colors.primaryStrong; setFont(ctx,40,900); ctx.fillText(fitText(ctx,$('#workTitle').value || '乙女游戏 REPO',470),28,83);
        ctx.fillStyle = colors.muted; setFont(ctx,11,800); ctx.textAlign='right'; ctx.fillText('制表人',612,43); ctx.fillText('填表人',612,68); ctx.textAlign='left';
        ctx.fillStyle = colors.primaryStrong; setFont(ctx,13,900); ctx.fillText('HARU',621,43);
        ctx.fillStyle = colors.accent; ctx.fillText(fitText(ctx,$('#fillerName').value || '',98),621,68);
        ctx.strokeStyle = rgba(colors.line,.9); ctx.lineWidth = 1.5; ctx.setLineDash([5,5]); ctx.beginPath(); ctx.moveTo(28,106); ctx.lineTo(722,106); ctx.stroke(); ctx.setLineDash([]);

        // Images
        const [coverImg, favImg, tasteBlindImg, tasteLooksImg, tasteVoiceImg, tastePersonalityImg, tastePlotImg, tasteDynamicImg] = await Promise.all([
          imageForCanvas(state.images.cover),
          imageForCanvas(state.images.favorite),
          imageForCanvas(state.images.tasteBlind),
          imageForCanvas(state.images.tasteLooks),
          imageForCanvas(state.images.tasteVoice),
          imageForCanvas(state.images.tastePersonality),
          imageForCanvas(state.images.tastePlot),
          imageForCanvas(state.images.tasteDynamic)
        ]);
        const placeholder = (x,y,w,h,label) => {
          box(ctx,x,y,w,h,15,colors.soft,mix(colors.line,'#ffffff',.15),1.5);
          ctx.fillStyle = colors.primary; setFont(ctx,34,400); ctx.textAlign='center'; ctx.fillText('+',x+w/2,y+h/2-5);
          ctx.fillStyle = colors.muted; setFont(ctx,12,800); ctx.fillText(label,x+w/2,y+h/2+22); ctx.textAlign='left';
        };
        if (coverImg) drawCoverImage(ctx,coverImg,28,122,182,306,15); else placeholder(28,122,182,306,'搜索或上传作品封面');
        ctx.strokeStyle = mix(colors.line,'#ffffff',.15); ctx.lineWidth=1.5; roundedPath(ctx,28,122,182,306,15); ctx.stroke();

        // Basic information
        const ix=228, iw=494;
        const field = (x,y,w,label,value) => {
          box(ctx,x,y,w,49,10,mix(colors.soft,'#ffffff',.35),mix(colors.line,'#ffffff',.18),1);
          ctx.fillStyle=colors.muted; setFont(ctx,9,900); ctx.fillText(label,x+9,y+14);
          ctx.fillStyle=colors.primaryStrong; setFont(ctx,16,900); ctx.fillText(fitText(ctx,value,w-18),x+9,y+37);
        };
        field(ix,122,271,'作品名称',$('#gameName').value || '');
        field(ix+279,122,92,'时长',$('#playTime').value || '');
        box(ctx,ix+379,122,115,49,10,mix(colors.soft,'#ffffff',.35),mix(colors.line,'#ffffff',.18),1);
        ctx.fillStyle=colors.muted; setFont(ctx,9,900); ctx.fillText('是否全通',ix+388,136);
        drawPill(ctx,'是',ix+388,145,state.completion==='yes',colors,10);
        drawPill(ctx,'否',ix+434,145,state.completion==='no',colors,10);

        // Platform and language
        box(ctx,ix,180,277,55,10,rgba('#ffffff',.58),mix(colors.line,'#ffffff',.18),1);
        box(ctx,ix+285,180,209,55,10,rgba('#ffffff',.58),mix(colors.line,'#ffffff',.18),1);
        ctx.fillStyle=colors.muted; setFont(ctx,9,900); ctx.fillText('游玩平台',ix+8,195); ctx.fillText('游玩语言',ix+293,195);
        let px=ix+8;
        ['NS','STEAM','PC碟','PSP','PSV','其他'].forEach(v=>{ px+=drawPill(ctx,v,px,203,state.platform===v,colors,8.5)+4; });
        px=ix+293;
        ['中文','日语','英语','其他'].forEach(v=>{ px+=drawPill(ctx,v,px,203,state.language===v,colors,8.5)+4; });

        // Rating panel：12 项按 3 列 × 4 行排列。
        box(ctx,ix,244,494,199,13,rgba('#ffffff',.62),mix(colors.line,'#ffffff',.18),1);
        ctx.fillStyle=colors.primaryStrong; setFont(ctx,14,900); ctx.fillText('评分',ix+10,264);
        const drawRating = (name,x,y) => {
          ctx.fillStyle=name==='总体'?colors.primaryStrong:colors.ink;
          setFont(ctx,10.5,900); ctx.fillText(name,x,y);
          const value=Number(state.ratings[name]||0);
          setFont(ctx,15.5,900);
          for(let i=1;i<=5;i++){
            ctx.fillStyle=i<=value?colors.accent:mix(colors.line,colors.paper,.35);
            ctx.fillText('★',x+34+(i-1)*18,y+1);
          }
        };
        ratingNames.forEach((name,index)=>{
          const col=index%3;
          const row=Math.floor(index/3);
          drawRating(name,ix+11+col*160,294+row*39);
        });

        // Ranking rows
        const rankRow = (y,label,value) => {
          box(ctx,28,y,694,58,13,rgba('#ffffff',.60),mix(colors.line,'#ffffff',.1),1.5);
          box(ctx,44,y-9,104,21,11,colors.paper,colors.line,1);
          ctx.fillStyle=colors.primaryStrong; setFont(ctx,12,900); ctx.textAlign='center'; ctx.fillText(label,96,y+6);
          ctx.fillStyle=colors.accent; setFont(ctx,21,900); ctx.fillText(fitText(ctx,value,640),375,y+39); ctx.textAlign='left';
        };
        rankRow(464,'剧情喜好排序',$('#plotRank').value || '');
        rankRow(534,'角色好感排序',$('#charRank').value || '');
        rankRow(604,'最喜爱END',$('#favoriteEnd').value || '');

        // Bottom cards
        const charCard = (x,img,category,name) => {
          box(ctx,x,624,166,338,16,rgba('#ffffff',.70),mix(colors.line,'#ffffff',.1),1.5);
          if(img) drawCoverImage(ctx,img,x+2,626,162,246,14); else placeholder(x+2,626,162,246,'搜索或上传人物');
          ctx.fillStyle=colors.primaryStrong; setFont(ctx,12,900); ctx.textAlign='center'; ctx.fillText(category,x+83,898);
          ctx.fillStyle=colors.accent; setFont(ctx,14,900); ctx.fillText(fitText(ctx,name,140),x+83,922); ctx.textAlign='left';
        };
        charCard(28,favImg,'最喜爱','');

        const tasteItems = [
          ['盲狙',tasteBlindImg], ['最喜欢外表',tasteLooksImg],
          ['最喜欢声音',tasteVoiceImg], ['最喜欢性格',tastePersonalityImg],
          ['最喜欢剧情',tastePlotImg], ['最喜欢关系性',tasteDynamicImg]
        ];
        const tasteCard = (index,label,img) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const x = 208 + col * 86.5;
          const y = 624 + row * 115;
          const w = 79.5;
          const h = 108;
          box(ctx,x,y,w,h,11,rgba('#ffffff',.72),mix(colors.line,'#ffffff',.1),1.2);
          if (img) drawCoverImage(ctx,img,x+1.5,y+1.5,w-3,80,9);
          else {
            box(ctx,x+1.5,y+1.5,w-3,80,9,colors.soft,null);
            ctx.fillStyle=colors.primary; setFont(ctx,25,400); ctx.textAlign='center'; ctx.fillText('+',x+w/2,y+48);
          }
          ctx.fillStyle=mix(colors.soft,'#ffffff',.35); ctx.fillRect(x+1,y+82,w-2,h-83);
          ctx.fillStyle=colors.primaryStrong; setFont(ctx,10.5,900); ctx.textAlign='center'; ctx.fillText(label,x+w/2,y+101);
          ctx.textAlign='left';
        };
        tasteItems.forEach((item,index) => tasteCard(index,item[0],item[1]));

        box(ctx,388,624,334,338,16,rgba('#ffffff',.70),mix(colors.line,'#ffffff',.1),1.5);
        ctx.fillStyle=colors.primaryStrong; setFont(ctx,15,900); ctx.fillText('感想',403,649);
        ctx.fillStyle=colors.ink; setFont(ctx,20,700); wrapText(ctx,$('#repoText').value || '',403,681,300,32,8);

        return canvas;
      }

      function closePreview() {
        $('#savePreview').classList.remove('open');
        if (currentExportUrl) URL.revokeObjectURL(currentExportUrl);
        currentExportUrl = '';
        currentExportBlob = null;
      }

      function downloadCurrentPng() {
        if (!currentExportBlob) return;
        const link = document.createElement('a');
        link.href = currentExportUrl;
        link.download = currentExportFilename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('已发起 PNG 下载；若无反应请长按预览图保存');
      }

      async function shareCurrentPng() {
        if (!currentExportBlob) return;
        try {
          const file = new File([currentExportBlob], currentExportFilename, { type:'image/png' });
          if (!navigator.share || (navigator.canShare && !navigator.canShare({files:[file]}))) throw new Error('当前浏览器不支持文件分享');
          await navigator.share({ files:[file], title:currentExportFilename });
        } catch (error) {
          if (error?.name !== 'AbortError') showToast('当前浏览器不能分享文件，可下载或长按图片保存');
        }
      }

      async function loadHtml2Canvas() {
        if (window.html2canvas) return window.html2canvas;
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        return window.html2canvas;
      }

      async function renderRepoExportCanvas() {
        const activePage = activeRepoPage === 'full' ? $('#repoCard') : $(`[data-page-id="${CSS.escape(activeRepoPage)}"]`);
        const sourcePages = [activePage].filter(Boolean);
        if (activeRepoPage === 'full') return renderRepoCanvas();
        const render = await loadHtml2Canvas();
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-100000px;top:0;width:750px;height:1000px;display:block;background:#fff;z-index:-1;';
        const exportStyle = document.createElement('style');
        exportStyle.textContent = '.repo-export-page{isolation:isolate!important}';
        host.appendChild(exportStyle);
        const imageJobs = [];

        sourcePages.forEach(sourcePage => {
          const clone = sourcePage.cloneNode(true);
          clone.hidden = false;
          clone.classList.add('repo-export-page');
          clone.style.cssText = 'position:relative;top:0;left:0;transform:none;display:block;width:750px;height:1000px;margin:0;';
          const sourceControls = sourcePage.querySelectorAll('input,textarea,select');
          const cloneControls = clone.querySelectorAll('input,textarea,select');
          sourceControls.forEach((sourceControl, index) => {
            const targetControl = cloneControls[index];
            if (!targetControl) return;
            if (sourceControl instanceof HTMLInputElement && ['checkbox','radio'].includes(sourceControl.type)) targetControl.checked = sourceControl.checked;
            else targetControl.value = sourceControl.value;
          });
          clone.querySelectorAll('img').forEach(image => {
            const source = image.currentSrc || image.src;
            if (!/^https?:\/\//i.test(source)) return;
            imageJobs.push(fetchImageData(source).then(dataUrl => {
              image.src = dataUrl;
              return image.decode?.();
            }).catch(() => undefined));
          });
          host.appendChild(clone);
        });

        document.body.appendChild(host);
        try {
          await Promise.all(imageJobs);
          const resolvedStyles = new Map();
          const resolveModernColors = (property, value) => {
            const cacheKey = `${property}:${value}`;
            if (resolvedStyles.has(cacheKey)) return resolvedStyles.get(cacheKey);
            const probe = document.createElement('span');
            probe.style.setProperty(property, value);
            document.body.appendChild(probe);
            let resolved = getComputedStyle(probe).getPropertyValue(property);
            probe.remove();
            resolved = resolved.replace(/color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/gi, (_, red, green, blue, alpha) => {
              const channels = [red, green, blue].map(channel => Math.round(Math.max(0, Math.min(1, Number(channel))) * 255));
              return alpha === undefined ? `rgb(${channels.join(',')})` : `rgba(${channels.join(',')},${alpha})`;
            });
            const safe = /color\(|color-mix\(/i.test(resolved) ? '' : resolved;
            resolvedStyles.set(cacheKey, safe);
            return safe;
          };
          const exportElements = [host, ...host.querySelectorAll('*')];
          exportElements.forEach(element => {
            const computed = getComputedStyle(element);
            for (let index = 0; index < computed.length; index += 1) {
              const property = computed[index];
              const value = computed.getPropertyValue(property);
              if (!/color\(|color-mix\(/i.test(value)) continue;
              if (property.startsWith('--')) continue;
              const resolved = resolveModernColors(property, value);
              if (resolved) element.style.setProperty(property, resolved, 'important');
            }
          });
          return await render(host, { scale:2, useCORS:true, allowTaint:false, backgroundColor:null, logging:false });
        } finally {
          host.remove();
        }
      }

      async function generatePng(trigger=$('#screenshotBtn')) {
        const button = trigger || $('#screenshotBtn');
        const oldText = button.textContent;
        button.disabled = true;
        button.textContent = '正在生成…';
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        try {
          if (document.fonts?.ready) await document.fonts.ready;
          const canvas = await renderRepoExportCanvas();
          const blob = await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('图片生成失败')),'image/png',1));
          if (currentExportUrl) URL.revokeObjectURL(currentExportUrl);
          currentExportBlob = blob;
          currentExportUrl = URL.createObjectURL(blob);
          currentExportFilename = `${($('#workTitle')?.value || '日乙repo').replace(/[\\/:*?"<>|]+/g,'_').trim()}_repo.png`;
          $('#previewImage').src = currentExportUrl;
          const shareButton = $('#sharePreview');
          shareButton.style.display = navigator.share ? '' : 'none';
          $('#savePreview').classList.add('open');
        } catch (error) {
          console.error(error);
          alert(error?.message || '图片生成失败，请重试。');
        } finally {
          button.disabled = false;
          button.textContent = oldText;
        }
      }

      let screenshotExitReady = false;

      async function enterScreenshotMode() {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        screenshotExitReady = false;
        document.body.classList.add('screenshot-mode');
        fitCanvas();
        window.scrollTo(0, 0);
        showToast('已进入截图模式：提示消失后按系统截图键，轻点屏幕退出');
        try {
          if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (error) {
          // Fullscreen is optional; screenshot mode still works without it.
        }
        fitCanvas();
        setTimeout(() => { screenshotExitReady = true; }, 700);
      }

      async function exitScreenshotMode() {
        if (!document.body.classList.contains('screenshot-mode')) return;
        screenshotExitReady = false;
        document.body.classList.remove('screenshot-mode');
        try {
          if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
        } catch (error) {}
        fitCanvas();
      }

      function autoFitTextArea(element) {
        if (!element) return;
        const maxFont = Number(element.dataset.maxFont || 18);
        const minFont = Number(element.dataset.minFont || 4.5);
        const lineHeight = Number(element.dataset.lineHeight || 1.4);
        let low = minFont;
        let high = maxFont;
        let best = minFont;

        element.style.lineHeight = String(lineHeight);
        element.style.fontSize = `${maxFont}px`;

        // Empty and very short text should use the largest, visually balanced size.
        if (!element.value.trim()) {
          element.style.fontSize = `${maxFont}px`;
          element.dataset.fittedFont = String(maxFont);
          return;
        }

        // Binary search gives a stable result even for long pasted text.
        for (let i = 0; i < 12; i++) {
          const mid = (low + high) / 2;
          element.style.fontSize = `${mid}px`;
          const fits = element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1;
          if (fits) {
            best = mid;
            low = mid;
          } else {
            high = mid;
          }
        }
        element.style.fontSize = `${Math.max(minFont, Math.floor(best * 10) / 10)}px`;
        element.dataset.fittedFont = element.style.fontSize;
      }

      function fitAllAdaptiveText() {
        $$('.auto-fit-text').forEach(autoFitTextArea);
      }

      function updateLongRepoCount(card=$(`[data-page-id="${CSS.escape(activeRepoPage)}"]`)) {
        const text = card?.querySelector('.long-repo-text')?.value || '';
        const count = text.replace(/\s/g, '').length;
        const label = card?.querySelector('[id^="longRepoCount"]');
        if (label) label.textContent = `${count} 字`;
      }

      function bindPersistFields(root=document) {
        root.querySelectorAll('.persist').forEach(el => {
          if (el.dataset.persistBound) return;
          el.dataset.persistBound = '1';
          el.addEventListener('input', () => {
            if (el.classList.contains('auto-fit-text')) autoFitTextArea(el);
            const card = el.closest('.long-repo-page');
            if (card) { updateLongRepoCount(card); if (el.classList.contains('long-repo-page-number')) renderPageSwitch(); }
            saveState();
          });
        });
      }

      function bindEvents() {
        window.addEventListener('resize', () => { fitCanvas(); requestAnimationFrame(fitAllAdaptiveText); }, { passive:true });
        window.addEventListener('pageshow', () => setTimeout(fitCanvas, 0), { passive:true });
        if (window.visualViewport) window.visualViewport.addEventListener('resize', fitCanvas, { passive:true });
        window.addEventListener('orientationchange', () => setTimeout(() => { fitCanvas(); fitAllAdaptiveText(); }, 180));
        document.addEventListener('fullscreenchange', () => { fitCanvas(); requestAnimationFrame(fitAllAdaptiveText); });
        bindPersistFields();
        $('#addLongPageBtn').addEventListener('click', () => addLongRepoPage(true));
        $('[data-repo-page="full"]').addEventListener('click', () => applyRepoPage('full', true));
        $$('#completionToggle button').forEach(btn => btn.addEventListener('click', () => setCompletion(btn.dataset.value, true)));
        $$('#platformChoices .choice-pill').forEach(btn => btn.addEventListener('click', () => setChoice('platform', state.platform === btn.dataset.value ? '' : btn.dataset.value, true)));
        $$('#languageChoices .choice-pill').forEach(btn => btn.addEventListener('click', () => setChoice('language', state.language === btn.dataset.value ? '' : btn.dataset.value, true)));

        $$('.image-picker').forEach(tile => {
          const open = () => openImageModal(tile.dataset.target);
          tile.addEventListener('click', open);
          tile.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
          });
        });

        $('#closeModal').addEventListener('click', closeImageModal);
        $('#imageModal').addEventListener('click', event => { if (event.target === $('#imageModal')) closeImageModal(); });
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape') {
            closeImageModal();
            closePreview();
            closeArchivePanel();
            closeThemePanel();
            exitScreenshotMode();
          }
        });

        $$('#imageModal .tab-btn').forEach(btn => btn.addEventListener('click', () => activateImageTab(btn.dataset.tab)));

        $('#librarySearch').addEventListener('input', event => renderImageLibrary(event.target.value));
        $$('#cropX,#cropY,#cropScale').forEach(input=>{
          input.addEventListener('input',()=>updateCropFromControls(false));
          input.addEventListener('change',()=>updateCropFromControls(true));
        });
        $$('[data-crop-preset]').forEach(btn=>btn.addEventListener('click',()=>{
          const preset=btn.dataset.cropPreset; const value=preset==='center'?{x:50,y:50,scale:1}:preset==='close'?{x:50,y:8,scale:1.22}:{x:50,y:0,scale:1};
          state.imageTransforms[currentTarget]=value; applyImageTransform(currentTarget); syncCropPanel(); saveState(); persistImageCropToLibrary();
        }));
        $('#removeCurrentImage').addEventListener('click',()=>{ if(!state.images?.[currentTarget])return; setImage(currentTarget,'','',true,true); syncCropPanel(); refreshImageLibrary(); showToast('已移除当前图片'); });
        $('#resetCropBtn').addEventListener('click',()=>{ if(!state.images?.[currentTarget])return; state.imageTransforms[currentTarget]=defaultImageTransform(currentTarget); applyImageTransform(currentTarget); syncCropPanel(); saveState(); persistImageCropToLibrary(); showToast('已重置裁剪'); });
        $('#finishCropBtn').addEventListener('click',async()=>{ if(!state.images?.[currentTarget]){ $('#modalStatus').textContent='请先选择一张图片'; activateImageTab('search'); return; } saveState(); await persistImageCropToLibrary(); closeImageModal(); showToast('图片与裁剪位置已保存'); });
        $('#cropFrame').addEventListener('pointerdown',event=>{
          if(!state.images?.[currentTarget])return; const transform=normalizeTransform(currentTarget,state.imageTransforms[currentTarget]); cropDrag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:transform.x,startY:transform.y}; $('#cropFrame').setPointerCapture?.(event.pointerId);
        });
        $('#cropFrame').addEventListener('pointermove',event=>{
          if(!cropDrag||cropDrag.id!==event.pointerId)return; const rect=$('#cropFrame').getBoundingClientRect(); const x=cropDrag.startX-(event.clientX-cropDrag.x)/rect.width*100; const y=cropDrag.startY-(event.clientY-cropDrag.y)/rect.height*100;
          state.imageTransforms[currentTarget]=normalizeTransform(currentTarget,{...state.imageTransforms[currentTarget],x,y}); applyImageTransform(currentTarget); syncCropPanel();
        });
        const finishCropDrag=()=>{ if(cropDrag){cropDrag=null;saveState();persistImageCropToLibrary();} }; $('#cropFrame').addEventListener('pointerup',finishCropDrag); $('#cropFrame').addEventListener('pointercancel',finishCropDrag);

        $('#searchImageBtn').addEventListener('click', searchImages);
        $('#searchInput').addEventListener('keydown', event => { if (event.key === 'Enter') searchImages(); });
        $('#fileInput').addEventListener('change', event => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (!file.type.startsWith('image/')) { $('#modalStatus').textContent = '请选择图片文件。'; return; }
          $('#modalStatus').textContent = '正在处理图片…';
          normalizeImageBlob(file).then(async dataUrl => {
            setImage(currentTarget,dataUrl,file.name.replace(/\.[^.]+$/,''),true,true);
            await addImageToLibrary(dataUrl,file.name.replace(/\.[^.]+$/,''),imageTargets[currentTarget].kind,'本地上传');
            event.target.value=''; continueToCrop('图片已导入，可调整取景后完成');
          }).catch(() => $('#modalStatus').textContent = '读取图片失败，请换一张图片。');
        });
        $('#useUrlBtn').addEventListener('click', () => {
          const url = $('#urlInput').value.trim();
          if (!/^https?:\/\//i.test(url)) { $('#modalStatus').textContent = '请输入以 http:// 或 https:// 开头的图片网址。'; return; }
          useRemoteImage(url);
        });

        $('#archiveBtn').addEventListener('click', openArchivePanel);
        $('#closeArchive').addEventListener('click', closeArchivePanel);
        $('#archiveBackdrop').addEventListener('click', event => { if (event.target === $('#archiveBackdrop')) closeArchivePanel(); });
        $('#saveArchiveBtn').addEventListener('click', () => saveCurrentArchive());
        $('#newArchiveBtn').addEventListener('click', startNewBlank);
        $('#activeArchivesTab').addEventListener('click',()=>{archiveView='active';$('#activeArchivesTab').classList.add('active');$('#trashArchivesTab').classList.remove('active');renderArchiveList($('#archiveSearch').value);});
        $('#trashArchivesTab').addEventListener('click',()=>{archiveView='trash';$('#trashArchivesTab').classList.add('active');$('#activeArchivesTab').classList.remove('active');renderArchiveList($('#archiveSearch').value);});
        $('#archiveSearch').addEventListener('input', event => renderArchiveList(event.target.value));
        $('#exportArchivesBtn').addEventListener('click', exportAllArchives);
        $('#importArchivesBtn').addEventListener('click', () => $('#archiveImportInput').click());
        $('#archiveImportInput').addEventListener('change', async event => {
          const file = event.target.files?.[0];
          if (!file) return;
          try { await importArchiveBackup(file); }
          catch (error) { alert(`导入失败：${error.message || '备份文件无法读取'}`); }
          event.target.value = '';
        });
        $('#closeTheme').addEventListener('click',closeThemePanel);
        $('#themeBackdrop').addEventListener('click',event=>{if(event.target===$('#themeBackdrop'))closeThemePanel();});
        $('#themeBackdrop').addEventListener('keydown',event=>{
          if(event.key!=='Tab'||!$('#themeBackdrop').classList.contains('open'))return;
          const focusable=$$('#themeBackdrop button:not([disabled]):not([hidden])').filter(node=>node.offsetParent!==null);
          if(!focusable.length)return;
          const first=focusable[0],last=focusable[focusable.length-1];
          if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
          else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
        });
        $('#randomThemeBtn').addEventListener('click',()=>{const options=showOnlyFavoriteThemes?palettes.filter(p=>themeFavorites().includes(p.id)):palettes;const pool=options.length?options:palettes;const pick=pool[Math.floor(Math.random()*pool.length)];applyPalette(pick.id,true);closeThemePanel();});
        $('#favoriteThemeFilter').addEventListener('click',()=>{showOnlyFavoriteThemes=!showOnlyFavoriteThemes;renderThemePanel();});
        $$('.color-style-btn').forEach(button => button.addEventListener('click', () => applyColorStyle(button.dataset.colorStyle, true)));
        $('#resetBtn').addEventListener('click', resetAll);
        $('#screenshotBtn').addEventListener('click', enterScreenshotMode);
        $('#closePreview').addEventListener('click', closePreview);
        $('#downloadPreview').addEventListener('click', downloadCurrentPng);
        $('#sharePreview').addEventListener('click', shareCurrentPng);
        $('#savePreview').addEventListener('click', event => { if (event.target === $('#savePreview')) closePreview(); });
        document.addEventListener('pointerup', event => {
          if (document.body.classList.contains('screenshot-mode') && screenshotExitReady) {
            event.preventDefault();
            exitScreenshotMode();
          }
        }, true);
      }

      /* Public bridge used by the game library to keep one independent REPO per game. */
      window.amoristRepoBridge = {
        getSnapshot: () => makeSnapshot(),
        setSnapshot: snapshot => applySnapshot(snapshot || {}),
        save: () => saveState(true)
      };
      renderPalettes();
      applyColorStyle(localStorage.getItem(COLOR_STYLE_KEY) || 'gradient');
      renderThemePanel();
      renderRatings();
      loadState();
      renderState();
      renderPageSwitch();
      bindEvents();
      window.addEventListener('pagehide', () => saveState(true), {capture:true});
      applyRepoPage(localStorage.getItem(REPO_PAGE_KEY) || 'full');
      fitCanvas();
      requestAnimationFrame(() => requestAnimationFrame(fitAllAdaptiveText));
      refreshArchiveLibrary();
      refreshImageLibrary();
      updateSaveStatus();
      updateLongRepoCount();
      saveState();
    })();
;

/* ===== productShellScript ===== */
(() => {
      const PRODUCT_VIEW_KEY = window.AMORIST_MODE === 'editor'
        ? 'amorist-editor-product-view-v1'
        : 'amorist-product-view-v1';
      const PRODUCT_UI_VIEW_KEY = window.AMORIST_MODE === 'editor'
        ? 'amoristUi.editorProductView.v1'
        : 'amoristUi.productView.v1';
      const PRODUCT_SESSION_KEY = 'amorist-product-session-v1';
      const LIBRARY_ROUTE_KEY = 'amoristUi.libraryRoute.v1';
      let libraryBrowseScrollY = 0;
      const GAME_LIBRARY_KEY = 'amorist-game-library-v1';
      const DASHBOARD_PLAYING_KEY = 'amorist-dashboard-playing-v1';
      const PROFILE_KEY = 'amorist-profile-v1';
      const FORMS_KEY = 'amorist-form-answers-v1';
      const $p = selector => document.querySelector(selector);
      const $$p = selector => [...document.querySelectorAll(selector)];
      const escapeProductHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
      const dataModel=window.AmoristDataModel;

      const productViews = new Set(['home','library','studio','profile','forms','characters','bangumi','timeline','oshi']);
      const hashView = () => {
        const view=decodeURIComponent(location.hash.replace(/^#\/?/,'').split('/')[0]||'');
        return productViews.has(view)?view:'';
      };
      const writeViewHash = view => {
        const next=`#/${view}`;
        if(location.hash!==next)history.pushState({amoristView:view},'',next);
      };
      function productToast(message) {
        const toast = $p('#toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(productToast.timer);
        productToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
      }

      function switchProductView(view, persist=true, sourceButton=null) {
        if (!productViews.has(view)) view = 'home';
        if(view==='studio' && sourceButton?.closest('.product-sidebar,.mobile-nav,.mobile-more-sheet')){
          window.amoristRepoManager?.enterEditor?.();
        }
        if(persist)writeViewHash(view);
        const currentView=$p('.product-view.active')?.dataset.productView||'';
        if (currentView === view) {
          if (persist && view === 'oshi') {
            localStorage.setItem('amoristUi.oshiRoute.v1', JSON.stringify({screen:'hub',id:''}));
            window.amoristOshiOpenHub?.();
          }
          if (persist && view === 'library') {
            localStorage.removeItem(LIBRARY_ROUTE_KEY);
            if ($p('#gameDetailPanel')) showLibraryBrowse();
          }
          if (view === 'home') renderDashboard();
          if (view === 'oshi') window.renderOshiHub?.();
          if (view === 'characters') window.renderCharacterBook?.();
          if (view === 'timeline') window.renderTimeline?.();
          return;
        }
        const leavingRepo=currentView === 'studio' && view !== 'studio' && window.amoristRepoManager;
        $$p('.product-view').forEach(section => section.classList.toggle('active', section.dataset.productView === view));
        $$p('[data-product-target]').forEach(button => {
          const active = button.dataset.productTarget === view &&
            Boolean(button.closest('.product-sidebar,.mobile-nav,.mobile-more-sheet'));
          button.classList.toggle('active', active);
          button.setAttribute('aria-current', active ? 'page' : 'false');
        });
        document.body.classList.toggle('bangumi-active', view === 'bangumi');
        if (persist) { localStorage.setItem(PRODUCT_VIEW_KEY, view); localStorage.setItem(PRODUCT_UI_VIEW_KEY, view); }
        if (view === 'studio') setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
        if (view === 'home') renderDashboard();
        if (view === 'oshi') {
          if (persist) {
            localStorage.setItem('amoristUi.oshiRoute.v1', JSON.stringify({screen:'hub',id:''}));
            window.amoristOshiOpenHub?.();
          }
          window.renderOshiHub?.();
        }
        if (view === 'characters') window.renderCharacterBook?.();
        if (view === 'timeline') window.renderTimeline?.();
        if (view === 'bangumi') window.amoristBangumiDiscovery?.openSearch?.({scroll:false});
        window.scrollTo({top:0, behavior:'auto'});
        if(leavingRepo){
          const persistRepo=()=>window.amoristRepoManager?.save();
          if(window.requestIdleCallback)requestIdleCallback(persistRepo,{timeout:900});
          else setTimeout(persistRepo,180);
        }
      }
      window.amoristProductNavigate = (view, persist=true) => switchProductView(view, persist);
      window.addEventListener('popstate',()=>switchProductView(hashView()||'home',false));
      window.addEventListener('hashchange',()=>switchProductView(hashView()||'home',false));

      $$p('[data-product-target]').forEach(button => button.addEventListener('click', () => switchProductView(button.dataset.productTarget,true,button)));

      const defaultGames = [];
      const LIBRARY_STATUS_MAP={'已通关':'已全通','游玩中':'进行中','搁置':'已封盘','封盘':'已封盘','想玩':'心愿单'};
      const LIBRARY_CATEGORY_MAP={'光るところあり':'love'};
      const libraryPreferenceOrder=dataModel.GAME_CATEGORIES.map(item=>item.id);
      const normalizeLibraryGame=game=>({...game,status:LIBRARY_STATUS_MAP[game?.status]||game?.status||'尚未分类',category:dataModel.normalizeGameCategory(LIBRARY_CATEGORY_MAP[game?.category]||game?.category)});
      let gameLibraryRawCache=null;
      let gameLibraryValueCache=[];
      function loadGames() {
        try {
          const raw = localStorage.getItem(GAME_LIBRARY_KEY);
          if (raw === gameLibraryRawCache) return gameLibraryValueCache;
          if (raw === null) { gameLibraryRawCache=null;gameLibraryValueCache=[];return gameLibraryValueCache; }
          const value = JSON.parse(raw); if(!Array.isArray(value))return [];
          const migrated=value.map(normalizeLibraryGame);
          const statusChanged=value.some((game,index)=>game?.status!==migrated[index]?.status);
          const nextRaw=statusChanged?JSON.stringify(value.map((game,index)=>({...game,status:migrated[index].status}))):raw;
          if(statusChanged)localStorage.setItem(GAME_LIBRARY_KEY,nextRaw);
          gameLibraryRawCache=nextRaw;gameLibraryValueCache=migrated;
          return gameLibraryValueCache;
        } catch { return []; }
      }
      function saveGames(games) {
        const normalized=games.map(normalizeLibraryGame),raw=JSON.stringify(normalized);
        localStorage.setItem(GAME_LIBRARY_KEY,raw);gameLibraryRawCache=raw;gameLibraryValueCache=normalized;
      }
      function selectedDashboardPlayingId() { return String(localStorage.getItem(DASHBOARD_PLAYING_KEY) || ''); }
      function renderDashboardPlayingSwitch(games, playing) {
        const wrap = $p('#dashboardPlayingSwitchWrap'), select = $p('#dashboardPlayingSelect');
        if (!wrap || !select) return;
        const candidates = games.filter(game => game.status === '进行中');
        wrap.hidden = window.AMORIST_MODE !== 'editor' || candidates.length < 2;
        select.innerHTML = '<option value="">自动选择</option>' + candidates.map(game => `<option value="${escapeProductHtml(game.id)}">${escapeProductHtml(game.name || '未命名游戏')}</option>`).join('');
        const selected = selectedDashboardPlayingId();
        select.value = candidates.some(game => String(game.id) === selected) ? selected : '';
        select.title = playing ? `当前：${playing.name || '未命名游戏'}` : '暂无进行中的游戏';
      }
      let activeLibraryFilter = '全部';
      let libraryBatchMode = false;
      const librarySelected = new Set();
      const libraryCategoryEligible = game => Boolean(game);
      let activeLibraryView = 'rank';
      let activeLibrarySort = 'updated';

      function setLibraryScreen(screen='browse') {
        const section = $p('.product-view[data-product-view="library"]');
        if (section) section.dataset.libraryScreen = screen;
      }

      function showLibraryBrowse() {
        setLibraryScreen('browse');
        if ($p('#gameDetailPanel')) $p('#gameDetailPanel').hidden = true;
        if ($p('#libraryBrowseView')) $p('#libraryBrowseView').hidden = false;
        renderGameLibrary();
      }

      function showLibraryDetail() {
        setLibraryScreen('detail');
        if ($p('#libraryBrowseView')) $p('#libraryBrowseView').hidden = true;
        if ($p('#libraryRankView')) $p('#libraryRankView').hidden = true;
        if ($p('#gameDetailPanel')) $p('#gameDetailPanel').hidden = false;
      }

      window.AmoristLibraryUI = { showBrowse:showLibraryBrowse, showDetail:showLibraryDetail, render:renderGameLibrary };

      function ensureLibraryReferenceUI() {
        const browse = $p('#libraryBrowseView');
        if (!browse) return;
        [['libraryCountText','span'],['libraryMetricAll','strong'],['libraryMetricCompleted','strong'],['libraryMetricPlaying','strong'],['gameLibraryGrid','div']].forEach(([id,tag])=>{if(!$p(`#${id}`)){const node=document.createElement(tag);node.id=id;node.hidden=true;browse.appendChild(node);}});
        const librarySection = browse.closest('.product-view[data-product-view="library"]') || browse.parentElement;
        const head = librarySection?.querySelector('.product-page-head');
        head?.classList.add('library-reference-head');
        if (head && !head.querySelector('#libraryReferenceMetrics')) {
          head.insertAdjacentHTML('beforeend', '<div class="library-reference-metrics" id="libraryReferenceMetrics" aria-label="游戏档案统计"><div><span>ALL WORKS</span><strong id="libraryMetricAll">0</strong></div><i></i><div><span>COMPLETED</span><strong id="libraryMetricCompleted">0</strong></div><i></i><div><span>PLAYING</span><strong id="libraryMetricPlaying">0</strong></div></div>');
        }
        const controls = browse.querySelector('.library-controls');
        controls?.classList.add('library-reference-toolbar');
        if (controls && !controls.querySelector('#gameLibrarySort')) {
          controls.insertAdjacentHTML('afterbegin', '<label class="library-reference-sort"><span>SORT BY</span><select id="gameLibrarySort" aria-label="排序方式"><option value="updated">最近更新</option><option value="started">开始日期</option><option value="completed">完成日期</option><option value="name">作品名称</option></select></label>');
        }
        if (controls && !controls.querySelector('#gameLibrarySearch')) {
          controls.insertAdjacentHTML('beforeend', '<div class="library-reference-tools"><input class="library-reference-search" id="gameLibrarySearch" placeholder="搜索作品" aria-label="搜索作品"><div class="library-reference-views" role="group" aria-label="切换视图"><button type="button" data-library-view="rank" aria-label="喜好轴视图" title="喜好轴视图">↕</button><button type="button" data-library-view="grid" aria-label="画册视图" title="画册视图">▦</button><button type="button" data-library-view="list" aria-label="列表视图" title="列表视图">☷</button></div></div>');
          $p('#gameLibrarySearch')?.addEventListener('input', event => renderGameLibrary(event.target.value));
          $p('#gameLibrarySort')?.addEventListener('change', event => { activeLibrarySort = event.target.value; renderGameLibrary(); });
          $$p('[data-library-view]').forEach(button => button.addEventListener('click', () => { activeLibraryView = button.dataset.libraryView; renderGameLibrary(); }));
        }
        if (controls && !controls.querySelector('#libraryAddGameButton')) {
          const add = document.createElement('button'); add.type='button'; add.id='libraryAddGameButton'; add.className='library-add-game'; add.textContent='＋ 添加作品'; add.addEventListener('click', () => openGameDialog('')); controls.appendChild(add);
        }
        if (librarySection) {
          const rankViews = librarySection.querySelectorAll('#libraryRankView');
          rankViews.forEach((node,index) => { if (index) node.remove(); });
          if (!rankViews.length) browse.insertAdjacentHTML('afterend', '<section class="library-rank-view" id="libraryRankView" hidden aria-label="作品喜好排名轴"><div class="library-rank-axis" id="libraryRankAxis"></div></section>');
        }
      }

      function initials(name) { return String(name || 'A').trim().slice(0,1).toUpperCase(); }
      function renderGameLibrary(query='') {
        ensureLibraryReferenceUI();
        if (!$p('#gameDetailPanel') || $p('#gameDetailPanel').hidden) setLibraryScreen('browse');
        const games = loadGames();
        const searchValue = query || $p('#gameLibrarySearch')?.value || '';
        const normalized = searchValue.trim().toLowerCase();
        const filtered = games.filter(game => {
          const statusMatch = activeLibraryFilter === '全部' || game.status === activeLibraryFilter;
          return statusMatch && (!normalized || `${game.name} ${game.note}`.toLowerCase().includes(normalized));
        });
        const grid = $p('#gameLibraryGrid');
        if (!$p('#libraryCountText')) { const node=document.createElement('span'); node.id='libraryCountText'; node.hidden=true; document.body.appendChild(node); }
        if (!$p('#libraryMetricAll')) { const node=document.createElement('strong'); node.id='libraryMetricAll'; node.hidden=true; document.body.appendChild(node); }
        if (!$p('#libraryMetricCompleted')) { const node=document.createElement('strong'); node.id='libraryMetricCompleted'; node.hidden=true; document.body.appendChild(node); }
        if (!$p('#libraryMetricPlaying')) { const node=document.createElement('strong'); node.id='libraryMetricPlaying'; node.hidden=true; document.body.appendChild(node); }
        if (!grid) return;
        $p('#libraryCountText').textContent = `${filtered.length} 部作品`;
        $p('#libraryMetricAll').textContent = games.length;
        $p('#libraryMetricCompleted').textContent = games.filter(game => game.status === '已全通').length;
        $p('#libraryMetricPlaying').textContent = games.filter(game => game.status === '进行中').length;
        const sortValue = activeLibrarySort;
        const valueOf = game => sortValue === 'name' ? String(game.name || '') : sortValue === 'started' ? String(game.startedAt || '') : sortValue === 'completed' ? String(game.completedAt || '') : String(game.updatedAt || '');
        const sorted = filtered.sort((a,b) => sortValue === 'name' ? valueOf(a).localeCompare(valueOf(b),'zh') : valueOf(b).localeCompare(valueOf(a)));
        const rankView = $p('#libraryRankView');
        grid.classList.toggle('library-list-mode', activeLibraryView === 'list');
        grid.hidden = activeLibraryView === 'rank';
        if (rankView) rankView.hidden = activeLibraryView !== 'rank';
        $$p('[data-library-view]').forEach(button => { const active = button.dataset.libraryView === activeLibraryView; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
        if (!filtered.length) {
          grid.innerHTML = '<div class="empty-library"><strong>这里暂时没有作品</strong>添加一部游戏，或者换一个筛选条件看看。</div>';
          if (activeLibraryView === 'rank') renderLibraryRank([]);
          else if (rankView) $p('#libraryRankAxis')?.replaceChildren();
          return;
        }
        const cardMarkup=(game,index)=>{
          const routeTotal=Array.isArray(game.routes)?game.routes.length:0;
          const routeDone=Array.isArray(game.routeDone)?game.routeDone.filter(route=>Array.isArray(game.routes)&&game.routes.includes(route)).length:0;
          const listSummary=activeLibraryView==='list'?`<div class="library-list-summary"><span><b>DEVELOPER</b>${escapeProductHtml(game.developer||'未记录')}</span><span><b>START DATE</b>${escapeProductHtml(game.startedAt||'未记录')}</span><span><b>CLEAR DATE</b>${escapeProductHtml(game.completedAt||'未记录')}</span><span><b>PLAY TIME</b>${game.hours?`${escapeProductHtml(game.hours)}h`:'未记录'}</span><span><b>ROUTES</b>${routeTotal?`${routeDone} / ${routeTotal}`:'未记录'}</span></div>`:'';
          const cardVariant=activeLibraryView==='list'?'':`${index===0?' library-reference-feature':''}${index===0||index===6||index===12?' library-reference-wide':''}`;
          return `
          <article class="game-card library-reference-card${cardVariant}${libraryBatchMode?' batch-mode':''}" data-game-id="${escapeProductHtml(game.id)}" tabindex="0">
            ${libraryBatchMode ? `<input class="batch-select" type="checkbox" data-batch-game="${escapeProductHtml(game.id)}" ${librarySelected.has(String(game.id))?'checked':''} aria-label="选择${escapeProductHtml(game.name)}">` : ''}
            <div class="game-cover">${game.cover ? `<img src="${escapeProductHtml(game.cover)}" alt="${escapeProductHtml(game.name)}" loading="lazy" referrerpolicy="no-referrer">` : escapeProductHtml(initials(game.name))}</div>
            <div class="game-card-body"><strong>${escapeProductHtml(game.name)}</strong><p>${escapeProductHtml(game.note || '还没有写下记录。')}</p><div class="game-meta"><span class="game-year">${escapeProductHtml(String(game.startedAt || game.completedAt || '').slice(0,4))}</span><span class="game-platform">${escapeProductHtml(game.platform || '')}</span><span class="game-hours">${game.hours ? `${escapeProductHtml(game.hours)}h` : ''}</span></div><div class="game-state ${game.status==='进行中'?'playing':game.status==='已封盘'?'hold':game.status==='心愿单'?'wish':''}">${escapeProductHtml(game.status)}</div>${listSummary}</div>
          </article>`;
        };
        grid.innerHTML=sorted.map(cardMarkup).join('');
        if (activeLibraryView === 'rank') renderLibraryRank(sorted);
        $$p('.game-card').forEach(card => {
          const open = () => window.AmoristGameStore?.renderGameDetail?.(card.dataset.gameId);
          card.addEventListener('click', event => {
            if (libraryBatchMode) {
              const checkbox = event.target.closest('[data-batch-game]');
              const id = card.dataset.gameId;
              if (checkbox) { checkbox.checked = librarySelected.has(id); return; }
              if (librarySelected.has(id)) librarySelected.delete(id); else librarySelected.add(id);
              renderGameLibrary(query);
              return;
            }
            open(event);
          });
          card.addEventListener('keydown', event => { if (event.key === 'Enter' && !libraryBatchMode) open(); });
          const checkbox = card.querySelector('[data-batch-game]');
          checkbox?.addEventListener('click', event => {
            event.stopPropagation();
            const id = card.dataset.gameId;
            if (checkbox.checked) librarySelected.add(id); else librarySelected.delete(id);
            updateLibraryBatchCount();
          });
        });
      }

      function renderLibraryRank(games) {
        const axis = $p('#libraryRankAxis');
        if (!axis) return;
        let dragging = null;
        let suppressDragClick = false;
        const card = game => `<article class="library-rank-card"${window.AMORIST_MODE === 'editor' ? ' draggable="true"' : ''} data-game-id="${escapeProductHtml(game.id)}"><figure><div class="library-rank-cover">${game.cover ? `<img src="${escapeProductHtml(game.cover)}" alt="${escapeProductHtml(game.name)}" loading="lazy" referrerpolicy="no-referrer">` : escapeProductHtml(initials(game.name))}</div><figcaption><strong>${escapeProductHtml(game.name)}</strong><div><span>${escapeProductHtml(String(game.startedAt || game.completedAt || '').slice(0,4))}</span><span>${escapeProductHtml(game.platform || '')}</span></div><em class="${game.status==='进行中'?'playing':game.status==='已封盘'?'hold':game.status==='心愿单'?'wish':''}">${escapeProductHtml(game.status)}</em></figcaption></figure></article>`;
        axis.innerHTML = libraryPreferenceOrder.map((category,index) => {
          const rows = games.filter(game => dataModel.normalizeGameCategory(game.category) === category);
          return `<section class="library-rank-tier" data-tier="${escapeProductHtml(category)}"><header><span>0${index+1}</span><h3>${escapeProductHtml(dataModel.gameCategoryLabel(category))}</h3><small>${escapeProductHtml(String(category).replace(/_/g,' ').toUpperCase())}</small><em>${rows.length} works</em></header><div class="library-rank-track">${rows.length ? rows.map(card).join('') : '<span class="library-rank-empty">尚无作品被放入这一层。</span>'}</div></section>`;
        }).join('');
        $p('#libraryRankAxis').querySelectorAll('.library-rank-card').forEach(item => {
          if (window.AMORIST_MODE === 'editor') {
            item.addEventListener('dragstart', event => { dragging = item; suppressDragClick = true; item.classList.add('dragging'); event.dataTransfer.effectAllowed='move'; event.dataTransfer.setData('text/plain', item.dataset.gameId); });
            item.addEventListener('dragend', () => { dragging = null; item.classList.remove('dragging'); setTimeout(() => { suppressDragClick = false; }, 0); });
          }
          item.addEventListener('click', () => { if (!suppressDragClick) { const game = games.find(row => String(row.id) === String(item.dataset.gameId)); if (game) window.AmoristGameStore?.renderGameDetail?.(game.id); } });
        });
        if (window.AMORIST_MODE !== 'editor') return;
        $p('#libraryRankAxis').querySelectorAll('.library-rank-tier').forEach(tier => {
          tier.addEventListener('dragover', event => { event.preventDefault(); tier.classList.add('drop-active'); });
          tier.addEventListener('dragleave', event => { if (!tier.contains(event.relatedTarget)) tier.classList.remove('drop-active'); });
          tier.addEventListener('drop', event => {
            event.preventDefault(); tier.classList.remove('drop-active');
            const id = event.dataTransfer.getData('text/plain') || dragging?.dataset.gameId;
            if (!id) return;
            const category = tier.dataset.tier;
            saveGames(loadGames().map(game => String(game.id) === String(id) ? {...game,category,updatedAt:Date.now()} : game));
            renderGameLibrary();
          });
        });
      }

      function updateLibraryBatchCount() {
        const count = $p('#librarySelectedCount'); if (count) count.textContent = librarySelected.size;
      }
      function openGameDialog(id='') {
        const game = loadGames().find(item => String(item.id) === String(id));
        $p('#gameDialogTitle').textContent = game ? '编辑游戏记录' : '添加到游戏档案';
        $p('#editingGameId').value = game?.id || '';
        $p('#libraryGameName').value = game?.name || '';
        $p('#libraryGameStatus').value = game?.status || '尚未分类';
        $p('#libraryGameCategory').value = dataModel.normalizeGameCategory(game?.category);
        $p('#libraryGameCategoryGroup').hidden = false;
        $p('#libraryGameProgress').value = Number(game?.progress || 0);
        $p('#libraryGameRating')?.querySelectorAll('[data-rating-value]').forEach(button => { const active = Number(button.dataset.ratingValue) <= Math.round(Number(game?.rating)||0); button.textContent = active ? '★' : '☆'; button.classList.toggle('active', active); button.setAttribute('aria-checked', String(Number(button.dataset.ratingValue) === Math.round(Number(game?.rating)||0))); });
        $p('#libraryGameCover').value = game?.cover || '';
        $p('#libraryGameNote').value = game?.note || '';
        const platformField=$p('#libraryGamePlatform'),platform=game?.platform||'';
        if(platformField){if(platform&&platformField.options&&!Array.from(platformField.options).some(option=>option.value===platform)){const option=document.createElement('option');option.value=platform;option.textContent=platform;platformField.append(option)}platformField.value=platform;}
        $p('#libraryGameHours').value = game?.hours ?? '';
        $p('#libraryGameRoutes').value = Array.isArray(game?.routes) ? game.routes.join('，') : (game?.routes || '');
        const timeline=window.AmoristTimelineStore?.read?.()||[];
        const startDateField=$p('#libraryGameStartDate'),completeDateField=$p('#libraryGameCompleteDate');
        if(startDateField)startDateField.value = game?.startedAt || timeline.find(event=>String(event?.gameId||'')===String(game?.id||'')&&event.type==='started')?.occurredAt || '';
        if(completeDateField)completeDateField.value = game?.completedAt || timeline.find(event=>String(event?.gameId||'')===String(game?.id||'')&&event.type==='completed')?.occurredAt || '';
        $p('#deleteGameButton').hidden = !game;
        $p('#gameDialogOverlay').classList.add('open');
        setTimeout(() => $p('#libraryGameName').focus(), 30);
      }
      function closeGameDialog() { $p('#gameDialogOverlay').classList.remove('open'); }
      $p('#libraryGameStatus').addEventListener('change',()=>{$p('#libraryGameCategoryGroup').hidden=false;});
      $p('#libraryGameRating')?.addEventListener('click',event=>{const button=event.target.closest('[data-rating-value]');if(!button)return;const value=Number(button.dataset.ratingValue);$p('#libraryGameRating').querySelectorAll('[data-rating-value]').forEach(item=>{const active=Number(item.dataset.ratingValue)<=value;item.textContent=active?'★':'☆';item.classList.toggle('active',active);item.setAttribute('aria-checked',String(Number(item.dataset.ratingValue)===value));});});
      $p('#closeGameDialog').addEventListener('click', closeGameDialog);
      $p('#gameDialogOverlay').addEventListener('click', event => { if (event.target === $p('#gameDialogOverlay')) closeGameDialog(); });
      $p('#gameDialogForm').addEventListener('submit', event => {
        event.preventDefault();
        const games = loadGames();
        const id = $p('#editingGameId').value;
        const routes=$p('#libraryGameRoutes').value.split(/[，,]/).map(value=>value.trim()).filter(Boolean);
        const previous=games.find(item=>String(item.id)===String(id));
        const record = { ...previous, id:id || `game-${Date.now()}`, name:$p('#libraryGameName').value.trim(), status:$p('#libraryGameStatus').value, category:dataModel.normalizeGameCategory($p('#libraryGameCategory').value), progress:Math.max(0,Math.min(100,Number($p('#libraryGameProgress').value)||0)), cover:$p('#libraryGameCover').value.trim(), note:$p('#libraryGameNote').value.trim(), platform:$p('#libraryGamePlatform').value.trim(), hours:Number($p('#libraryGameHours').value)||0, rating:Number($p('#libraryGameRating [aria-checked="true"]')?.dataset.ratingValue)||0, routes, startedAt:$p('#libraryGameStartDate')?.value||'', completedAt:$p('#libraryGameCompleteDate')?.value||'', routeSelectionCustomized:true, routeDone:Array.isArray(previous?.routeDone)?previous.routeDone:[], logs:previous?.logs||[], updatedAt:Date.now() };
        const index = games.findIndex(item => String(item.id) === String(id));
        if (index >= 0) games[index] = record; else games.push(record);
        saveGames(games); closeGameDialog(); renderGameLibrary(); renderDashboard(); productToast('游戏记录已保存');
      });
      $p('#deleteGameButton').addEventListener('click', () => {
        const id = $p('#editingGameId').value;
        const game = loadGames().find(item => String(item.id) === String(id));
        if (!game || !confirm(`从游戏档案删除「${game.name}」？`)) return;
        saveGames(loadGames().filter(item => String(item.id) !== String(id))); closeGameDialog(); renderGameLibrary(); renderDashboard(); productToast('已从游戏档案移除');
      });
      $$p('[data-library-filter]').forEach(button => button.addEventListener('click', () => {
        activeLibraryFilter = button.dataset.libraryFilter;
        $$p('[data-library-filter]').forEach(item => item.classList.toggle('active', item === button));
        renderGameLibrary();
      }));
      $p('#libraryBatchToggle')?.addEventListener('click', () => {
        libraryBatchMode = !libraryBatchMode;
        if (!libraryBatchMode) librarySelected.clear();
        $p('#libraryBatchActions').hidden = !libraryBatchMode;
        $p('#libraryBatchToggle').textContent = libraryBatchMode ? '完成管理' : '批量管理';
        renderGameLibrary(); updateLibraryBatchCount();
      });
      $p('#libraryBatchAll')?.addEventListener('click', () => {
        const visible = [...document.querySelectorAll('#gameLibraryGrid .game-card')].map(card => card.dataset.gameId);
        const allSelected = visible.length && visible.every(id => librarySelected.has(id));
        visible.forEach(id => allSelected ? librarySelected.delete(id) : librarySelected.add(id));
        renderGameLibrary(); updateLibraryBatchCount();
      });
      $p('#libraryBatchApply')?.addEventListener('click', () => {
        const status = $p('#libraryBatchStatus').value;
        const category = $p('#libraryBatchCategory').value;
        if (!librarySelected.size) return productToast('请先选择作品');
        if (!status && !category) return productToast('请选择要修改的状态或分类');
        let categoryCount=0;
        const rows = loadGames().map(game => {
          if (!librarySelected.has(String(game.id))) return game;
          const next={...game,updatedAt:Date.now()};
          if(status)next.status=status;
          if(category&&libraryCategoryEligible(next)){next.category=category;categoryCount++;}
          return next;
        });
        saveGames(rows);librarySelected.clear();
        $p('#libraryBatchStatus').value='';$p('#libraryBatchCategory').value='';
        renderGameLibrary();renderDashboard();updateLibraryBatchCount();
        productToast(category&&!categoryCount?'状态已更新':'已批量更新作品');
      });
      $p('#libraryBatchDelete')?.addEventListener('click', () => {
        if (!librarySelected.size) return productToast('请先选择作品');
        const rows = loadGames(), targets = rows.filter(game => librarySelected.has(String(game.id)));
        if (!targets.length || !confirm(`删除选中的 ${targets.length} 部作品？`)) return;
        saveGames(rows.filter(game => !librarySelected.has(String(game.id)))); librarySelected.clear(); renderGameLibrary(); renderDashboard(); updateLibraryBatchCount(); productToast(`已删除 ${targets.length} 部作品`);
      });
      $p('#libraryBatchCancel')?.addEventListener('click', () => { libraryBatchMode=false; librarySelected.clear(); $p('#libraryBatchStatus').value=''; $p('#libraryBatchCategory').value=''; $p('#libraryBatchActions').hidden=true; $p('#libraryBatchToggle').textContent='批量管理'; renderGameLibrary(); updateLibraryBatchCount(); });
      window.addEventListener('amorist-data-changed', event => {
        if (!event.detail || event.detail.games) {
          renderGameLibrary();
          renderDashboard();
        }
      });

      function readProfile() {
        const fallback = {name:'HARU',handle:'@yourname',bio:'喜欢故事里无法被替代的相遇。\n慢慢玩，认真写，也允许自己反复心动。',years:'2020',type:'强剧情 · 成长型角色',favorite:'等待填写',tags:'乙女游戏,剧情党,长评选手',age:'',platformId:'',sameFan:'',platforms:'',languages:'',oshiChars:'',playstyle:'',voiceActors:'',xp:'',worldview:'',scriptWriters:'',likedWorks:'',wishlist:''};
        try { return {...fallback,...JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')}; } catch { return fallback; }
      }
      function profileChips(str) { return String(str||'').split(/[，,]/).map(s=>s.trim()).filter(Boolean).map(s=>`<span>${escapeProductHtml(s)}</span>`).join(''); }
      function profileList(str) { return String(str||'').split(/\n/).map(s=>s.trim()).filter(Boolean).map(s=>`<span>${escapeProductHtml(s)}</span>`).join(''); }
      function profileText(str) { return escapeProductHtml(String(str||'').replace(/\n/g,'<br>')); }
      function renderHomeGreeting() {
        const greeting = $p('#homeGreeting');
        if (!greeting) return;
        const now = new Date();
        const hour = now.getHours();
        const period = hour < 5 ? 'evening' : hour < 11 ? 'morning' : hour < 18 ? 'day' : 'evening';
        const candidates = {
          morning: ['おはよう', 'Bonjour', 'Good morning', 'Buongiorno', 'Buenos días', 'Guten Morgen', 'Bom dia'],
          day: ['こんにちは', 'Bonjour', 'Hello', 'Ciao', 'Hola', 'Salut', '안녕하세요'],
          evening: ['こんばんは', 'Bonsoir', 'Good evening', 'Buonasera', 'Buenas noches', 'Guten Abend', 'Boa noite']
        }[period];
        const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        let hash = 0;
        for (const char of `${dateKey}:${period}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
        greeting.textContent = candidates[hash % candidates.length];
      }
      function renderProfile(syncInputs=true) {
        const p = readProfile();
        if (syncInputs) $$p('.profile-field').forEach(field => { if (field.dataset.profileKey) field.value = p[field.dataset.profileKey] || ''; });
        /* Page 1 */
        $p('#profileDisplayName').textContent = p.name || '未命名玩家';
        $p('#profileDisplayHandle').textContent = p.handle || '@yourname';
        $p('#profileDisplayBio').textContent = p.bio || '';
        $p('#profileDisplayYears').textContent = p.years || '—';
        $p('#profileDisplayAge').textContent = p.age || '—';
        $p('#profileDisplayPlatformId').textContent = p.platformId || '—';
        $p('#profileDisplaySameFan').textContent = p.sameFan || '—';
        $p('#profileDisplayPlatforms').innerHTML = profileChips(p.platforms);
        $p('#profileDisplayLanguages').innerHTML = profileChips(p.languages);
        $p('#profileDisplayOshi').innerHTML = profileList(p.oshiChars);
        $p('#profileDisplayType').textContent = p.type || '—';
        $p('#profileDisplayPlaystyle').textContent = p.playstyle || '—';
        $p('#profileDisplayTags').innerHTML = profileChips(p.tags);
        /* Page 2 */
        $p('#profileDisplayName2').textContent = p.name || '未命名玩家';
        $p('#profileDisplayVA').innerHTML = profileText(p.voiceActors);
        $p('#profileDisplayXP').innerHTML = profileText(p.xp);
        $p('#profileDisplayWorld').innerHTML = profileText(p.worldview);
        $p('#profileDisplayScript').innerHTML = profileText(p.scriptWriters);
        $p('#profileDisplayFavorite').textContent = p.favorite || '—';
        $p('#profileDisplayLiked').innerHTML = profileList(p.likedWorks);
        $p('#profileDisplayWishlist').innerHTML = profileList(p.wishlist);
        /* Game library sync */
        renderProfileGames();
        /* Sidebar & home */
        const sidebarName = $p('#sidebarName');
        const sidebarAvatar = $p('#sidebarAvatar');
        if (sidebarName) sidebarName.textContent = p.name || '玩家';
        if (sidebarAvatar) sidebarAvatar.textContent = initials(p.name);
        renderHomeGreeting();
      }
      function renderProfileGames() {
        try {
          const games = JSON.parse(localStorage.getItem('amorist-game-library-v1')||'[]');
          const list = Array.isArray(games) ? games : [];
          const playing = list.filter(g=>g.status==='进行中');
          const finished = list.filter(g=>g.status==='已全通');
          const elPlaying = $p('#profileDisplayPlaying');
          const elFinished = $p('#profileDisplayFinished');
          const elArchive = $p('#profileArchiveStats');
          if (elPlaying) elPlaying.innerHTML = playing.length ? playing.map(g=>`<span>${escapeProductHtml(g.name)}</span>`).join('') : '<span style="opacity:.5">暂无</span>';
          if (elFinished) elFinished.innerHTML = finished.length ? finished.map(g=>`<span>${escapeProductHtml(g.name)}</span>`).join('') : '<span style="opacity:.5">暂无</span>';
          if (elArchive) elArchive.textContent = `游戏档案 ${list.length} · 全通 ${finished.length}`;
        } catch {}
      }
      /* Profile editor tabs */
      $$p('.profile-tab').forEach(tab => tab.addEventListener('click', () => {
        $$p('.profile-tab').forEach(t => t.classList.toggle('active', t === tab));
        $$p('.profile-editor-section').forEach(s => s.classList.toggle('active', s.dataset.profileSection === tab.dataset.profileTab));
      }));
      /* Profile page switching */
      let activeProfilePage = 1;
      function switchProfilePage(page) {
        activeProfilePage = Number(page);
        $$p('.profile-page-btn').forEach(b => b.classList.toggle('active', b.dataset.profilePage == page));
        $$p('.profile-canvas-dot').forEach(b => b.classList.toggle('active', b.dataset.profilePage == page));
        $$p('.profile-canvas').forEach(c => {
          const match = c.dataset.profileCard == page;
          c.classList.toggle('active', match);
          c.style.display = match ? '' : 'none';
        });
        /* Page 1: show basic tab only; Page 2: show prefs + works simultaneously */
        if (page == 1) {
          $$p('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.profileTab === 'basic'));
          $$p('.profile-editor-section').forEach(s => s.classList.toggle('active', s.dataset.profileSection === 'basic'));
        } else {
          $$p('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.profileTab !== 'basic'));
          $$p('.profile-editor-section').forEach(s => s.classList.toggle('active', s.dataset.profileSection !== 'basic'));
        }
      }
      $$p('.profile-page-btn').forEach(b => b.addEventListener('click', () => switchProfilePage(b.dataset.profilePage)));
      $$p('.profile-canvas-dot').forEach(b => b.addEventListener('click', () => switchProfilePage(b.dataset.profilePage)));
      /* Input listeners */
      $$p('.profile-field').forEach(field => field.addEventListener('input', () => {
        if (!field.dataset.profileKey) return;
        const profile = readProfile(); profile[field.dataset.profileKey] = field.value;
        localStorage.setItem(PROFILE_KEY,JSON.stringify(profile)); renderProfile(false);
      }));
      /* Capture active page */
      $p('#profileCaptureButton').onclick = () => {
        const card = activeProfilePage === 1 ? $p('#profileCanvas1') : $p('#profileCanvas2');
        const name = `${readProfile().name||'我的'}-自介${activeProfilePage===1?'属性':'偏好'}.png`;
        captureProductElement(card, name, $p('#profileCaptureButton'));
      };

      const formTemplates = {
        monthly:{title:'本月游戏手账',subtitle:'MONTHLY OTOME NOTES',questions:['这个月玩了哪些作品？','本月最喜欢的一部作品是？','最让你心动的角色是谁？','印象最深的一幕是什么？','有没有意外的雷点或惊喜？','下个月最想开启哪一部？']},
        taste:{title:'乙女玩家偏好表',subtitle:'MY PERSONAL TASTE',questions:['你最重视剧情、角色还是氛围？','最喜欢怎样的世界观？','最容易心动的角色属性？','你会避开的角色属性？','偏爱的美术与配色风格？','喜欢甜度高还是刀度高？','最喜欢的关系性是什么？','用三个词总结你的乙女游戏品味。']},
        annual:{title:'年度乙游总结',subtitle:'YEAR IN OTOME GAMES',questions:['今年一共通关了哪些作品？','年度最佳作品？','年度本命角色？','年度最佳路线？','最意难平的结局？','最惊喜的新作？','今年的游玩关键词？','明年最期待什么？']},
        character:{title:'角色心动问卷',subtitle:'CHARACTER LOVE FILE',questions:['角色姓名与出处？','第一次心动发生在哪里？','最喜欢的外表细节？','最喜欢的性格细节？','最难忘的一句台词？','最喜欢他与主角怎样的相处？','如果能对他说一句话？']},
        route:{title:'路线速记卡',subtitle:'ROUTE QUICK NOTES',questions:['作品与路线名称？','通关日期与游玩时长？','路线总体评分？','最喜欢的剧情点？','最大的雷点？','一句话结论？']},
        wishlist:{title:'待玩愿望清单',subtitle:'OTOME WISHLIST',questions:['最想玩的作品？','被什么吸引？','期待的角色或声优？','准备在哪个平台玩？','优先级是？','计划什么时候开坑？']}
      };
      let activeFormId = '';
      function loadFormAnswers() { try { return JSON.parse(localStorage.getItem(FORMS_KEY)||'{}') || {}; } catch { return {}; } }
      function openFormTemplate(id) {
        const template = formTemplates[id]; if (!template) return;
        activeFormId=id;
        $p('#formTemplates').style.display='none'; $p('#formWorkspace').classList.add('active'); $p('#backToTemplates').hidden=false;
        $p('#activeFormTitle').textContent=template.title; $p('#activeFormSubtitle').textContent=template.subtitle;
        const saved=loadFormAnswers()[id]||[];
        $p('#answerList').innerHTML=template.questions.map((question,index)=>`<div class="answer-row"><div class="answer-number">${String(index+1).padStart(2,'0')}</div><div><label>${escapeProductHtml(question)}</label><textarea data-answer-index="${index}" placeholder="在这里写下你的回答">${escapeProductHtml(saved[index]||'')}</textarea></div></div>`).join('');
        $p('#answerList').querySelectorAll('textarea').forEach(area=>area.addEventListener('input',saveActiveForm));
      }
      function saveActiveForm(silent=true) {
        if (!activeFormId) return;
        const all=loadFormAnswers(); all[activeFormId]=$$p('#answerList textarea').map(area=>area.value); localStorage.setItem(FORMS_KEY,JSON.stringify(all));
        if (!silent) productToast('表格回答已保存');
      }
      $$p('[data-form-template]').forEach(card=>card.addEventListener('click',()=>openFormTemplate(card.dataset.formTemplate)));
      $p('#saveFormAnswers').addEventListener('click',()=>saveActiveForm(false));
      $p('#clearFormAnswers').addEventListener('click',()=>{ if(!activeFormId||!confirm('清空这份表格的全部回答？'))return; const all=loadFormAnswers(); delete all[activeFormId]; localStorage.setItem(FORMS_KEY,JSON.stringify(all)); openFormTemplate(activeFormId); productToast('回答已清空'); });
      $p('#backToTemplates').addEventListener('click',()=>{ activeFormId=''; $p('#formTemplates').style.display='grid'; $p('#formWorkspace').classList.remove('active'); $p('#backToTemplates').hidden=true; });

      function renderDashboard() {
        const games=loadGames();
        const playingCandidates=games.filter(game=>game.status==='进行中');
        const selectedId=selectedDashboardPlayingId();
        const playing=playingCandidates.find(game=>String(game.id)===selectedId) || playingCandidates[0];
        renderDashboardPlayingSwitch(games, playing);
        $p('#metricGames').textContent=games.length;
        $p('#metricFinished').textContent=games.filter(game=>game.status==='已全通').length;
        const archiveCounter=$p('#archiveCount');
        $p('#metricCreated').textContent=archiveCounter?.textContent?.trim() || '0';
        const totalHours=games.reduce((sum,game)=>sum+(Number(game.hours)||0),0);
        if($p('#metricHours'))$p('#metricHours').textContent=`${Math.round(totalHours*10)/10}h`;
        $p('#dashboardPlayingTitle').textContent=playing?.name || '暂无进行中的游戏';
        $p('#dashboardPlayingMeta').textContent=playing ? (playing.note || playing.status || '进行中') : '在游戏档案中将状态设为「进行中」';
        const progress=Math.max(0,Math.min(100,Number(playing?.progress)||0));
        $p('#dashboardProgressBar').style.width=`${progress}%`;
        $p('#dashboardProgressText').textContent=`${progress}%`;
        const cover=$p('#dashboardPlayingCover');
        if(cover){
          cover.innerHTML=playing?.cover
            ? `<img src="${escapeProductHtml(playing.cover)}" alt="${escapeProductHtml(playing.name)}" referrerpolicy="no-referrer"><span>NOW PLAYING</span>`
            : `<span>${playing?escapeProductHtml(initials(playing.name)):'AMORIST'}</span>`;
        }
        const recent=[...games].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,3);
        $p('#dashboardRecentGames').innerHTML=recent.length ? recent.map(game=>`<div class="recent-item"><div class="recent-cover">${game.cover?`<img src="${escapeProductHtml(game.cover)}" alt="${escapeProductHtml(game.name)}" loading="lazy" referrerpolicy="no-referrer">`:escapeProductHtml(initials(game.name))}</div><div class="recent-info"><strong>${escapeProductHtml(game.name)}</strong><span>${escapeProductHtml(game.status||'尚未分类')} · ${Number(game.progress)||0}%</span></div></div>`).join('') : '<div class="empty-library"><strong>暂无游戏记录</strong></div>';
        let characters=[];
        try{const saved=JSON.parse(localStorage.getItem('amorist-character-book-v1')||'[]');characters=window.AmoristCharacterBookVisibility.filter(Array.isArray(saved)?saved:[],games)}catch{}
        const character=[...characters].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
        const spotlight=$p('#homeCharacterSpotlight');
        if(spotlight){
          const characterGame=games.find(game=>String(game.id)===String(character?.gameId||''));
          const characterGameName=character?.gameName||character?.sourceGame||character?.workTitle||characterGame?.name||'未知作品';
          spotlight.innerHTML=character?`<div class="home-character-card"><div class="spotlight-avatar">${character.image?`<img src="${escapeProductHtml(character.image)}" alt="${escapeProductHtml(character.name||'角色')}" loading="lazy" referrerpolicy="no-referrer">`:escapeProductHtml(initials(character.name))}</div><div><h3>${escapeProductHtml(character.nameCn||character.name||'未命名角色')}</h3><p>来自“${escapeProductHtml(characterGameName)}”</p></div></div>`:'<div class="spotlight-empty">暂无角色记录</div>';
        }
      }

      let dashboardCharacter=null;
      let dashboardCharacterId='';
      let dashboardBangumiGames=[];
      function dashboardCharacterGameName(character){
        const gameRows=loadGames();
        const characterGameId=String(character?.gameId||'');
        const subjectIds=[character?.bangumiSubjectId,...(Array.isArray(character?.bangumiSubjectIds)?character.bangumiSubjectIds:[])].filter(Boolean).map(String);
        const linkedGame=gameRows.find(game=>String(game.id)===characterGameId)
          ||gameRows.find(game=>subjectIds.includes(String(game.bangumiId||game.bangumiDisplayId||'')))
          ||dashboardBangumiGames.find(game=>subjectIds.includes(String(game.id||game.bangumiId||'')));
        return String(character?.gameName||character?.sourceGame||character?.workTitle||linkedGame?.nameCn||linkedGame?.name||'').trim();
      }
      function dashboardCharacters(){
        try{
          const gameRows=loadGames();
          const value=JSON.parse(localStorage.getItem('amorist-character-book-v1')||'[]');
          const saved=window.AmoristCharacterBookVisibility.filter(Array.isArray(value)?value.filter(Boolean):[],gameRows);
          const indexed=gameRows.filter(game=>window.AmoristCharacterBookVisibility.visibleStatuses.has(String(game.status||'').trim())).flatMap(game=>(Array.isArray(game.sourceCharacters)?game.sourceCharacters:[]).map(character=>({...character,gameId:character.gameId||game.id,bangumiSubjectId:character.bangumiSubjectId||game.bangumiId||game.bangumiDisplayId||'',gameName:game.name,sourceGame:game.name})));
          const merged=[...saved,...indexed],seen=new Set();
          return merged.filter(character=>{const key=String(character.bangumiCharacterId||character.id||character.name||'');if(!key||seen.has(key)||!dashboardCharacterGameName(character))return false;seen.add(key);return true;});
        }catch{return[]}
      }
      function renderDashboardRandomCharacter(force=false){
        const spotlight=$p('#homeCharacterSpotlight');
        if(!spotlight)return;
        const rows=dashboardCharacters();
        if(!rows.length){spotlight.innerHTML='<div class="spotlight-empty">暂无角色记录</div>';dashboardCharacter=null;dashboardCharacterId='';return;}
        const sectionHeading=spotlight.closest('.home-character-section')?.querySelector('.section-head h2');
        if(sectionHeading)sectionHeading.textContent='随机角色';
        const available=rows.filter(row=>String(row.bangumiCharacterId||row.id||'')!==String(dashboardCharacterId));
        if(force||!dashboardCharacter||!rows.includes(dashboardCharacter))dashboardCharacter=(available.length?available:rows)[Math.floor(Math.random()*(available.length?available:rows).length)];
        dashboardCharacterId=String(dashboardCharacter.bangumiCharacterId||dashboardCharacter.id||'');
        const name=dashboardCharacter.nameCn||dashboardCharacter.name||'未命名角色';
        const image=dashboardCharacter.image||dashboardCharacter.cover||'';
        const gameName=dashboardCharacterGameName(dashboardCharacter);
        const detailButton=spotlight.closest('.home-character-section')?.querySelector('.section-head .text-button');
        if(detailButton){
          detailButton.textContent='查看角色 →';
          detailButton.removeAttribute('data-product-target');
          detailButton.id='dashboardCharacterDetailButton';
          if(!detailButton.dataset.dashboardBound){
            detailButton.dataset.dashboardBound='1';
            detailButton.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();if(dashboardCharacterId)window.dispatchEvent(new CustomEvent('amorist-open-character',{detail:dashboardCharacterId}));},true);
          }
        }
        spotlight.innerHTML=`<div class="home-character-card"><button class="spotlight-avatar" id="dashboardCharacterAvatar" type="button" aria-label="查看${escapeProductHtml(name)}大图">${image?`<img src="${escapeProductHtml(image)}" alt="${escapeProductHtml(name)}" loading="lazy" referrerpolicy="no-referrer">`:escapeProductHtml(initials(name))}</button><div class="spotlight-copy"><h3>${escapeProductHtml(name)}</h3><p>来自“${escapeProductHtml(gameName)}”</p><button class="text-button spotlight-random-button" id="dashboardCharacterRandomButton" type="button">换一位 →</button></div></div>`;
      }
      window.addEventListener('amorist-bangumi-cache-ready',event=>{
        dashboardBangumiGames=Array.isArray(event.detail?.list)?event.detail.list:[];
        renderDashboardRandomCharacter(true);
      });
      function bindDashboardRecentGames(){
        const rows=loadGames();
        $p('#dashboardRecentGames')?.querySelectorAll('.recent-item').forEach(item=>{
          const name=item.querySelector('.recent-info strong')?.textContent?.trim();
          const game=rows.find(row=>row.name===name);
          if(game)item.dataset.dashboardGameId=String(game.id);
        });
      }
      const renderDashboardBase=renderDashboard;
      renderDashboard=()=>{renderDashboardBase();renderDashboardRandomCharacter();bindDashboardRecentGames();};
      document.addEventListener('click',event=>{
        const recentGame=event.target.closest('#dashboardRecentGames .recent-item[data-dashboard-game-id]');
        if(recentGame){
          event.preventDefault();
          const id=recentGame.dataset.dashboardGameId;
          window.amoristProductNavigate?.('library');
          setTimeout(()=>{const card=[...document.querySelectorAll('#gameLibraryGrid .game-card')].find(node=>String(node.dataset.gameId)===String(id));card?.click();},0);
          return;
        }
        if(event.target.closest('#dashboardCharacterRandomButton')){event.preventDefault();event.stopPropagation();renderDashboardRandomCharacter(true);return;}
        if(event.target.closest('#dashboardCharacterAvatar')&&dashboardCharacter){
          event.preventDefault();
          let modal=document.querySelector('#dashboardCharacterLightbox');
          if(!modal){modal=document.createElement('div');modal.id='dashboardCharacterLightbox';modal.className='dashboard-character-lightbox';modal.innerHTML='<button type="button" aria-label="关闭大图">×</button><img alt="">';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.tagName==='BUTTON')modal.hidden=true;});}
          const image=dashboardCharacter.image||dashboardCharacter.cover;
          if(image){modal.querySelector('img').src=image;modal.querySelector('img').alt=dashboardCharacter.nameCn||dashboardCharacter.name||'';modal.hidden=false;}
        }
      });
      document.addEventListener('click',event=>{
        const image=event.target.closest('img');
        if(!image||image.closest('#dashboardCharacterLightbox'))return;
        const interactive=image.closest('button,a,[role="button"],[data-product-target],[data-action],[data-game-id],[data-char-id],[data-bangumi-id],[data-asset-game],.game-card,.char-card,.recent-item,.library-card,.bangumi-db-card,.bangumi-db-char,.game-source-char,.oshi-figure,.oshi-gallery-item,.asset-pick,.theme-card');
        if(interactive||image.closest('[data-no-image-preview]'))return;
        const source=image.currentSrc||image.src;
        if(!source)return;
        let modal=document.querySelector('#dashboardCharacterLightbox');
        if(!modal){modal=document.createElement('div');modal.id='dashboardCharacterLightbox';modal.className='dashboard-character-lightbox';modal.innerHTML='<button type="button" aria-label="关闭大图">×</button><img alt="">';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.tagName==='BUTTON')modal.hidden=true;});}
        event.preventDefault();
        event.stopPropagation();
        image.dataset.imagePreview='';
        modal.querySelector('img').src=source;
        modal.querySelector('img').alt=image.alt||'图片预览';
        modal.hidden=false;
      });
      document.addEventListener('keydown',event=>{ if(event.key==='Escape'){closeGameDialog();const modal=$p('#dashboardCharacterLightbox');if(modal)modal.hidden=true;} });

      async function captureProductElement(element,filename,button) {
        const original=button.textContent; button.disabled=true; button.textContent='正在生成…';
        try {
          if (!window.html2canvas) await new Promise((resolve,reject)=>{ const script=document.createElement('script'); script.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'; script.onload=resolve; script.onerror=reject; document.head.appendChild(script); });
          const canvas=await window.html2canvas(element,{scale:2,useCORS:true,backgroundColor:null,logging:false,scrollY:-window.scrollY});
          const link=document.createElement('a'); link.download=filename.replace(/[\\/:*?"<>|]/g,'-'); link.href=canvas.toDataURL('image/png'); link.click(); productToast('分享图片已生成');
        } catch { productToast('当前环境无法直接生成，请使用系统截图保存'); }
        finally { button.disabled=false; button.textContent=original; }
      }
      $p('#captureFormAnswers').addEventListener('click',()=>{ if(!activeFormId)return; saveActiveForm(true); captureProductElement($p('.answer-sheet'),`${formTemplates[activeFormId].title}.png`,$p('#captureFormAnswers')); });

      renderProfile(); renderGameLibrary(); renderDashboard();
      $p('#dashboardPlayingSelect')?.addEventListener('change', event => {
        const id = event.target.value;
        if (id) localStorage.setItem(DASHBOARD_PLAYING_KEY, id);
        else localStorage.removeItem(DASHBOARD_PLAYING_KEY);
        renderDashboard();
      });
      let hasProductSession=false;
      try { hasProductSession=sessionStorage.getItem(PRODUCT_SESSION_KEY)==='1'; sessionStorage.setItem(PRODUCT_SESSION_KEY,'1'); } catch {}
      const restoredProductView=hashView()||(hasProductSession
        ? (localStorage.getItem(PRODUCT_UI_VIEW_KEY)||localStorage.getItem(PRODUCT_VIEW_KEY)||'home')
        : 'home');
      switchProductView(restoredProductView,false);
      document.body.classList.add('product-routing-ready');
      setTimeout(renderDashboard,500);
    })();
;

/* ===== connectedFeaturesScript ===== */
(() => {
      const GAME_KEY='amorist-game-library-v1';
      const PROFILE_KEY='amorist-profile-v1';
      const VISUAL_KEY='amorist-visual-sheets-v1';
      const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
      const safe=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
      const dataModel=window.AmoristDataModel;
      const games=()=>{try{const v=JSON.parse(localStorage.getItem(GAME_KEY)||'[]');return Array.isArray(v)?v.map(dataModel.normalizeGameRecord):[]}catch{return[]}};
      const saveGames=v=>localStorage.setItem(GAME_KEY,JSON.stringify(v.map(dataModel.normalizeGameRecord)));
      const go=view=>document.querySelector(`[data-product-target="${view}"]`)?.click();
      const TIMELINE_KEY='amorist-timeline-events-v1',TIMELINE_MIGRATION_KEY='amorist-timeline-migration-version';
      const timelineId=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
      const timelineGameEventId=(gameId,type)=>`game-${String(gameId||'')}-${String(type||'')}-timeline`;
      const timelineRouteKey=value=>String(value||'').normalize('NFKC').trim().toLowerCase();
      const timelineRouteEventId=(gameId,route)=>`route-completed-${encodeURIComponent(String(gameId||''))}-${encodeURIComponent(timelineRouteKey(route))}`;
      const isSameRouteEvent=(event,gameId,route)=>String(event?.gameId||'')===String(gameId||'')&&['route','route_completed'].includes(String(event?.type||''))&&timelineRouteKey(event?.route)===timelineRouteKey(route);
      const timelineDateValue=value=>{if(!value)return '';const text=String(value).trim(),parts=text.match(/^(\d{4})[\/-](\d{1,2})(?:[\/-](\d{1,2}))?$/);if(/^\d{4}$/.test(text))return text;if(parts){const year=parts[1],month=String(parts[2]).padStart(2,'0');return parts[3]?`${year}-${month}-${String(parts[3]).padStart(2,'0')}`:`${year}-${month}`};if(/^\d{4}-\d{2}$/.test(text)||/^\d{4}-\d{2}-\d{2}$/.test(text))return text;const date=new Date(text);return Number.isNaN(date.getTime())?'':`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`};
      const timelinePrecision=value=>['day','month','year','unknown'].includes(value)?value:(/^\d{4}-\d{2}-\d{2}$/.test(String(value))?'day':/^\d{4}-\d{2}$/.test(String(value))?'month':/^\d{4}$/.test(String(value))?'year':'unknown');
      const TIMELINE_ALLOWED_TYPES=new Set(['started','completed','session']);
      function readTimelineEventsRaw(){try{const value=JSON.parse(localStorage.getItem(TIMELINE_KEY)||'[]');return Array.isArray(value)?value: value&&Array.isArray(value.events)?value.events:[]}catch{return[]}}
      function readTimelineEvents(){return readTimelineEventsRaw().filter(event=>TIMELINE_ALLOWED_TYPES.has(String(event?.type||'')))}
      function normalizeTimelineEvent(event){const occurredAt=timelineDateValue(event?.occurredAt||event?.date),type=String(event?.type||'session')==='route'?'route_completed':String(event?.type||'session'),route=String(event?.route||'');return {...event,id:type==='route_completed'&&route?timelineRouteEventId(event?.gameId,route):String(event?.id||timelineId('timeline')),gameId:String(event?.gameId||''),type,occurredAt,datePrecision:timelinePrecision(event?.datePrecision||occurredAt),title:String(event?.title||''),note:String(event?.note||event?.text||''),source:String(event?.source||'manual'),route,progress:event?.progress==null?null:Number(event.progress),playHours:event?.playHours==null?null:Number(event.playHours),createdAt:Number(event?.createdAt)||Date.now(),updatedAt:Number(event?.updatedAt)||Date.now()};}
      function canonicalizeTimelineEvents(events){
        const output=[];
        (Array.isArray(events)?events:[]).forEach(raw=>{
          const event=normalizeTimelineEvent(raw);
          if(!TIMELINE_ALLOWED_TYPES.has(event.type))return;
          const sameId=output.findIndex(item=>item.id===event.id);
          if(sameId>=0)output[sameId]=event;else output.push(event);
        });
        return output;
      }
      function writeTimelineEvents(events){localStorage.setItem(TIMELINE_KEY,JSON.stringify({version:2,events:canonicalizeTimelineEvents(events)}));window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{timeline:true}}));}
      function migrateTimelineData(){
        const current=readTimelineEventsRaw(),canonical=canonicalizeTimelineEvents(current);
        const gameRows=games(),cleanedGames=gameRows.map(game=>({...game,logs:(Array.isArray(game.logs)?game.logs:[]).filter(log=>!/^(?:通关路线|取消标记)\s*[：:]/.test(String(log?.text||'').trim()))}));
        if(gameRows.some((game,index)=>(game.logs||[]).length!==cleanedGames[index].logs.length))saveGames(cleanedGames);
        const synced=gameRows.reduce((events,game)=>['started','completed'].reduce((rows,type)=>{const date=type==='started'?game.startedAt:game.completedAt;if(!date)return rows;const existing=rows.find(event=>event.gameId===String(game.id)&&event.type===type);if(existing){existing.occurredAt=date;existing.datePrecision='day';}else rows.push(normalizeTimelineEvent({id:timelineGameEventId(game.id,type),gameId:game.id,type,occurredAt:date,datePrecision:'day',title:timelineTypeLabel(type),source:'game-edit'}));return rows},events),canonical.map(event=>({...event})));
        if(JSON.stringify(current)!==JSON.stringify(synced)||localStorage.getItem(TIMELINE_MIGRATION_KEY)!=='2')writeTimelineEvents(synced);
        localStorage.setItem(TIMELINE_MIGRATION_KEY,'2');
      }
      function timelineGameName(id){return games().find(game=>String(game.id)===String(id))?.name||'未知作品';}
      function eventSortValue(event){const raw=String(event.occurredAt||'');if(event.datePrecision==='unknown'||!raw)return 0;if(event.datePrecision==='year')return Number(raw)*10000;if(event.datePrecision==='month')return Number(raw.replace('-',''))*100+31;return new Date(raw).getTime()||0;}
      function timelineDateLabel(event){const raw=String(event.occurredAt||'');if(event.datePrecision==='unknown'||!raw)return '日期待确认';if(event.datePrecision==='year')return `${raw}年`;if(event.datePrecision==='month'){const [year,month]=raw.split('-');return `${year}年${Number(month)}月`;}const date=new Date(`${raw}T00:00:00`);return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`;}
      function timelineTypeLabel(type){return ({started:'开始游玩',completed:'游戏全通',session:'游玩记录'})[type]||'游玩时间';}
      window.searchBangumiCharacters=async function(keyword){
        const q=String(keyword||'').trim();if(!q)return[];
        const r=await fetch('https://api.bgm.tv/v0/search/characters?limit=20&offset=0',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({keyword:q,sort:'match'})});
        if(!r.ok)throw new Error('HTTP '+r.status);
        const json=await r.json();return Array.isArray(json.data)?json.data:[];
      };
      const toast=message=>{const t=$('#toast');if(!t)return;t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2000)};
      const initial=name=>String(name||'A').trim().slice(0,1).toUpperCase();

      function updateProfileArchiveStats(){
        const rows=games(), el=$('#profileArchiveStats');
        if(el) el.textContent=`游戏档案 ${rows.length} · 全通 ${rows.filter(g=>g.status==='已全通').length}`;
        const safe=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
        const playing=rows.filter(g=>g.status==='进行中'), finished=rows.filter(g=>g.status==='已全通');
        const elP=$('#profileDisplayPlaying'), elF=$('#profileDisplayFinished');
        if(elP) elP.innerHTML=playing.length?playing.map(g=>`<span>${safe(g.name)}</span>`).join(''):'<span style="opacity:.5">暂无</span>';
        if(elF) elF.innerHTML=finished.length?finished.map(g=>`<span>${safe(g.name)}</span>`).join(''):'<span style="opacity:.5">暂无</span>';
        updateConnectedDashboard();
      }
      function updateConnectedDashboard(){
        const rows=games(),hours=rows.reduce((sum,g)=>sum+(Number(g.hours)||0),0);
        if($('#metricGames'))$('#metricGames').textContent=rows.length;
        if($('#metricFinished'))$('#metricFinished').textContent=rows.filter(g=>g.status==='已全通').length;
        if($('#metricHours'))$('#metricHours').textContent=`${Math.round(hours*10)/10}h`;
      }
      window.addEventListener('amorist-data-changed',event=>{
        if(!event.detail||event.detail.timeline)updateConnectedDashboard();
      });

      function openEnhancedGameDialog(game=null){
        $('#gameDialogTitle').textContent=game?'编辑游戏档案':'添加到游戏档案';
        $('#editingGameId').value=game?.id||'';
        $('#libraryGameName').value=game?.name||'';
        $('#libraryGameStatus').value=game?.status||'尚未分类';
        $('#libraryGameCategory').value=dataModel.normalizeGameCategory(game?.category);
        $('#libraryGameCategoryGroup').hidden=false;
        $('#libraryGameProgress').value=Number(game?.progress||0);
        $('#libraryGameRating')?.querySelectorAll('[data-rating-value]').forEach(button=>{const active=Number(button.dataset.ratingValue)<=Math.round(Number(game?.rating)||0);button.textContent=active?'★':'☆';button.classList.toggle('active',active);button.setAttribute('aria-checked',String(Number(button.dataset.ratingValue)===Math.round(Number(game?.rating)||0)));});
        $('#libraryGameCover').value=game?.cover||'';
        $('#libraryGameNote').value=game?.note||'';
        const platformField=$('#libraryGamePlatform'),platform=game?.platform||'';
        if(platformField){if(platform&&platformField.options&&!Array.from(platformField.options).some(option=>option.value===platform)){const option=document.createElement('option');option.value=platform;option.textContent=platform;platformField.append(option)}platformField.value=platform;}
        $('#libraryGameHours').value=game?.hours??'';
        $('#libraryGameRoutes').value=Array.isArray(game?.routes)?game.routes.join('，'):(game?.routes||'');
        const gameTimeline=readTimelineEvents().filter(event=>String(event?.gameId||'')===String(game?.id||''));
        const startDateField=$('#libraryGameStartDate'),completeDateField=$('#libraryGameCompleteDate');
        if(startDateField)startDateField.value=game?.startedAt||gameTimeline.find(event=>event.type==='started')?.occurredAt||'';
        if(completeDateField)completeDateField.value=game?.completedAt||gameTimeline.find(event=>event.type==='completed')?.occurredAt||'';
        $('#deleteGameButton').hidden=!game;
        $('#gameDialogOverlay').classList.add('open');
      }
      window.openEnhancedGameDialog = openEnhancedGameDialog;

      $('#libraryGameRating')?.addEventListener('click',event=>{const button=event.target.closest('[data-rating-value]');if(!button)return;const value=Number(button.dataset.ratingValue);$('#libraryGameRating').querySelectorAll('[data-rating-value]').forEach(item=>{const active=Number(item.dataset.ratingValue)<=value;item.textContent=active?'★':'☆';item.classList.toggle('active',active);item.setAttribute('aria-checked',String(Number(item.dataset.ratingValue)===value));});});

      $('#libraryCoverUploadButton').onclick=()=>$('#libraryCoverUploadInput').click();
      $('#libraryCoverUploadInput').onchange=event=>{const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{const max=480,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);$('#libraryGameCover').value=canvas.toDataURL('image/jpeg',.74);toast('本地封面已压缩并加入档案')};image.src=reader.result};reader.readAsDataURL(file);event.target.value=''};

      $('#gameDialogForm').addEventListener('submit',event=>{
        event.preventDefault();
        const rows=games(), id=$('#editingGameId').value || rows.at(-1)?.id, index=rows.findIndex(g=>g.id===id);
        if(index<0)return;
        const old=rows[index];
const routes=$('#libraryGameRoutes').value.split(/[，,]/).map(x=>x.trim()).filter(Boolean),progress=gameRouteProgress(routes,old.routeDone||[]);rows[index]={...old,category:dataModel.normalizeGameCategory($('#libraryGameCategory').value),platform:$('#libraryGamePlatform').value.trim(),hours:Number($('#libraryGameHours').value)||0,rating:Number($('#libraryGameRating [aria-checked="true"]')?.dataset.ratingValue)||0,routes,startedAt:$('#libraryGameStartDate')?.value||'',completedAt:$('#libraryGameCompleteDate')?.value||'',progress:progress==null?Number($('#libraryGameProgress').value)||0:progress,routeSelectionCustomized:true,routeDone:old.routeDone||[],logs:old.logs||[]};
        saveGames(rows);
        const syncGameTimeline=(type,date)=>{const next=readTimelineEvents().filter(event=>!(String(event?.gameId||'')===String(id)&&event.type===type));if(date)next.push(normalizeTimelineEvent({id:timelineGameEventId(id,type),gameId:id,type,occurredAt:date,datePrecision:'day',title:timelineTypeLabel(type),source:'game-edit'}));writeTimelineEvents(next)};
        try{syncGameTimeline('started',$('#libraryGameStartDate')?.value||'');syncGameTimeline('completed',$('#libraryGameCompleteDate')?.value||'')}catch(error){console.warn('游玩时间同步失败',error)}
        updateProfileArchiveStats(); if(!$('#gameDetailPanel').hidden)renderGameDetail(id);
      });
      $('#deleteGameButton').addEventListener('click',()=>setTimeout(updateProfileArchiveStats,0));
      $$('[data-product-target="library"]').forEach(button=>button.addEventListener('click',()=>{localStorage.removeItem('amoristUi.libraryRoute.v1');window.AmoristLibraryUI?.showBrowse?.()},true));
      $$('[data-open-dashboard-game]').forEach(button=>button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        const candidates=games().filter(game=>game.status==='霑幄｡御ｸｭ');
        const selectedId=localStorage.getItem('amorist-dashboard-playing-v1')||candidates[0]?.id;
        const playing=candidates.find(game=>String(game.id)===String(selectedId))||candidates[0];
        if(!playing){window.amoristProductNavigate?.('library');return;}
        window.amoristProductNavigate?.('library');
        setTimeout(()=>renderGameDetail(playing.id),0);
      },true));
      $$('[data-open-dashboard-game-direct]').forEach(button=>button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        const rows=games();
        const selectedId=localStorage.getItem('amorist-dashboard-playing-v1');
        const dashboardName=$('#dashboardPlayingTitle')?.textContent?.trim();
        const playing=rows.find(game=>String(game.id)===String(selectedId))||rows.find(game=>game.name===dashboardName)||rows[0];
        if(!playing){window.amoristProductNavigate?.('library');return;}
        window.amoristProductNavigate?.('library');
        setTimeout(()=>renderGameDetail(playing.id),0);
      },true));

      const GAME_REPO_KEY='amorist-game-repos-v1';
      let activeRepoGameId='';
      // A repo opened from the game library is a saved showcase.  Keep this
      // separate from the sidebar REPO editor so the showcase cannot mutate
      // either the game snapshot or the user's general draft.
      let activeRepoReadonly=false;
      let editorRepoSnapshot=null;
      let activeRepoDirty=false;
      let activeRepoSaveTimer=0;
      let activeRepoSaveUsesIdle=false;
      function gameRepoMap(){try{const value=JSON.parse(localStorage.getItem(GAME_REPO_KEY)||'{}');return value&&typeof value==='object'?value:{}}catch{return {}}}
      function saveActiveGameRepo(force=false){
        if(activeRepoSaveTimer){if(activeRepoSaveUsesIdle&&window.cancelIdleCallback)cancelIdleCallback(activeRepoSaveTimer);else clearTimeout(activeRepoSaveTimer);}
        activeRepoSaveTimer=0;activeRepoSaveUsesIdle=false;
        if(activeRepoReadonly||!activeRepoGameId||!window.amoristRepoBridge)return;
        if(!force&&!activeRepoDirty)return;
        activeRepoDirty=false;
        const map=gameRepoMap();map[activeRepoGameId]=window.amoristRepoBridge.getSnapshot();
        localStorage.setItem(GAME_REPO_KEY,JSON.stringify(map));window.amoristRepoBridge.save();
      }
      function scheduleActiveGameRepoSave(){
         if(activeRepoReadonly||!activeRepoGameId)return;
        activeRepoDirty=true;
        if(activeRepoSaveTimer){if(activeRepoSaveUsesIdle&&window.cancelIdleCallback)cancelIdleCallback(activeRepoSaveTimer);else clearTimeout(activeRepoSaveTimer);}
        const persist=()=>{activeRepoSaveTimer=0;activeRepoSaveUsesIdle=false;saveActiveGameRepo();};
        if(window.requestIdleCallback){activeRepoSaveUsesIdle=true;activeRepoSaveTimer=requestIdleCallback(persist,{timeout:1000});}
        else activeRepoSaveTimer=setTimeout(persist,360);
      }
      function newGameRepoSnapshot(game){
        const base=window.amoristRepoBridge?.getSnapshot?.()||{};
        const zeroRatings=Object.fromEntries(['剧情','创意','感情','文笔','氛围','立意','趣味','立绘','CG','音乐','配音','总体'].map(name=>[name,0]));
        return {...base,palette:base.palette||'mintLavender',completion:'yes',platform:game.platform||'',language:'',ratings:zeroRatings,images:game.cover?{cover:game.cover}:{},imageTransforms:{},fields:{gameName:game.name,playTime:game.hours?`${game.hours}h`:''}};
      }
      window.amoristRepoManager={
        open(game, options={}){
          const wasReadonly=activeRepoReadonly;
          saveActiveGameRepo(true);activeRepoGameId=game.id;
           activeRepoReadonly=Boolean(options.readonly) && window.AMORIST_MODE === 'public';
          if(activeRepoReadonly&&!wasReadonly) editorRepoSnapshot=window.amoristRepoBridge?.getSnapshot?.()||null;
          const stored=gameRepoMap()[game.id];
          const snapshot=stored?{...stored,images:{...(stored.images||{}),...(game.cover&&!stored.images?.cover?{cover:game.cover}:{})}}:newGameRepoSnapshot(game);
           const previousReadonlyLoad=window.AMORIST_REPO_READONLY_LOADING;
           window.AMORIST_REPO_READONLY_LOADING=activeRepoReadonly;
           try { window.amoristRepoBridge?.setSnapshot(snapshot); }
           finally { window.AMORIST_REPO_READONLY_LOADING=previousReadonlyLoad; }
          activeRepoDirty=false;
          setRepoReadonly(activeRepoReadonly);
          if(!options.inline)window.amoristProductNavigate?.('studio');
        },
        enterEditor(){
          saveActiveGameRepo(true);
          activeRepoGameId='';
          activeRepoReadonly=false;
          if(editorRepoSnapshot) window.amoristRepoBridge?.setSnapshot(editorRepoSnapshot);
          setRepoReadonly(false);
        },
        save:()=>saveActiveGameRepo(true),
        label:()=>{const game=games().find(item=>item.id===activeRepoGameId);return game?`REPO · ${game.name}`:''},
        hasActive:()=>Boolean(activeRepoGameId)
      };
      function setRepoReadonly(readonly){
        activeRepoReadonly=Boolean(readonly);
        const root=$('.product-view[data-product-view="studio"]');
        if(!root)return;
        root.classList.toggle('repo-readonly',activeRepoReadonly);
        // A game-specific REPO is a showcase: remove authoring controls while
        // retaining navigation and screenshot export for viewers.
        ['#paletteList','#addLongPageBtn','#archiveBtn','#resetBtn'].forEach(selector=>{
          root.querySelectorAll(selector).forEach(node=>{ node.hidden=activeRepoReadonly; });
        });
        root.querySelectorAll('.persist').forEach(field=>{
          field.toggleAttribute('readonly',activeRepoReadonly && field.tagName!=='SELECT');
          field.setAttribute('aria-readonly',String(activeRepoReadonly));
        });
         root.querySelectorAll('select').forEach(field=>{ field.disabled=activeRepoReadonly; });
         root.querySelectorAll('.stars button').forEach(button=>{
           button.disabled=activeRepoReadonly;
           button.setAttribute('aria-disabled',String(activeRepoReadonly));
         });
        root.querySelectorAll('.completion button,.choice-pill').forEach(button=>{
          button.disabled=activeRepoReadonly;
          button.setAttribute('aria-disabled',String(activeRepoReadonly));
        });
        root.querySelectorAll('.image-picker').forEach(tile=>{
          tile.setAttribute('aria-disabled',String(activeRepoReadonly));
          tile.tabIndex=activeRepoReadonly?-1:0;
        });
      }
      document.addEventListener('input',event=>{
        if(activeRepoReadonly||!activeRepoGameId||!event.target.closest('.product-view[data-product-view="studio"]'))return;
        scheduleActiveGameRepoSave();
      },true);
      document.addEventListener('click',event=>{
        if(activeRepoReadonly||!activeRepoGameId)return;
        const control=event.target.closest('.color-style-btn,.theme-card,.theme-current-btn,.page-switch-btn,.page-add-btn,.image-picker');
        if(control||event.target.closest('.product-view[data-product-view="studio"]'))scheduleActiveGameRepoSave();
      },true);
      $('#repoBackToGame')?.addEventListener('click',()=>{
        const id=activeRepoGameId;window.amoristProductNavigate?.('library');
        if(id)setTimeout(()=>renderGameDetail(id),30);
      });
      window.addEventListener('pagehide',()=>saveActiveGameRepo(true),{capture:true});
      function writeLegacyGameToRepo(game){
        // Game detail pages are part of the public index and only showcase
        // the saved repo.  The sidebar button remains the editing entrypoint.
        window.amoristRepoManager.open(game,window.AMORIST_MODE==='public'?{readonly:true}:{});
        toast(`已打开「${game.name}」的 REPO`);
      }

      function writeGameToRepo(game){
        if(window.AMORIST_MODE==='public'){
          window.amoristRepoManager.open(game,{readonly:true,inline:true});$('#publicRepoPreview')?.remove();
          const source=$('#repoCard');if(!source)return;
          const overlay=document.createElement('div');overlay.id='publicRepoPreview';overlay.className='public-repo-preview';overlay.innerHTML='<div class="public-repo-preview-head"><span>游戏 REPO</span><button type="button" aria-label="关闭 REPO 预览">×</button></div><div class="public-repo-preview-stage"></div>';
          const pages=[source,...$$('.long-repo-page')].map((page,index)=>{const paper=page.cloneNode(true);if(index===0)paper.id='repoCard';else{paper.removeAttribute('id');paper.removeAttribute('hidden')}paper.querySelectorAll('input,textarea,select,button').forEach(control=>{control.disabled=true;control.tabIndex=-1});return paper});pages.forEach(paper=>overlay.querySelector('.public-repo-preview-stage').appendChild(paper));document.body.appendChild(overlay);const close=()=>overlay.remove();overlay.querySelector('button').onclick=close;overlay.addEventListener('click',event=>{if(event.target===overlay)close()});return;
        }
        window.amoristRepoManager.open(game,{});toast(`已打开「${game.name}」的 REPO`);
      }

      function saveGamePatch(id,patch){
        const rows=games(),i=rows.findIndex(g=>g.id===id);if(i<0)return;
        rows[i]={...rows[i],...patch,updatedAt:Date.now()};saveGames(rows);updateProfileArchiveStats();renderGameDetail(id);
      }

      function gameLogDateValue(value){
        const match=String(value||'').match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
        if(match)return `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
        const date=value?new Date(value):new Date();
        if(Number.isNaN(date.getTime()))return '';
        return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      }

      function gameCharacterRole(character){
        const relation=String(character?.relation||character?.role||character?.role_name||'').normalize('NFKC').toLowerCase();
        if(/女主角|女主|主人公|ヒロイン|heroine/.test(relation))return 'heroine';
        if(/攻略对象|攻略対象|攻略角色|可攻略|男主角|target/.test(relation))return 'target';
        if(/配角|脇役|support|side|other|其他角色/.test(relation))return 'support';
        if(/主角|主役|main|protagonist|メイン/.test(relation))return 'main';
        return 'other';
      }
      function gameRouteNames(game){
        const current=[...(Array.isArray(game.routes)?game.routes:[])].map(value=>String(value||'').trim()).filter(Boolean);
        if(game.routeSelectionCustomized)return [...new Set(current)];
        const source=Array.isArray(game.sourceCharacters)?game.sourceCharacters:(Array.isArray(game.chars)?game.chars:[]);
        if(!source.length)return [...new Set(current)];
        const target=source.filter(character=>gameCharacterRole(character)==='target').map(character=>String(character.name||'').trim()).filter(Boolean);
        if(target.length)return [...new Set(target)];
        const heroine=new Set(source.filter(character=>gameCharacterRole(character)==='heroine').map(character=>String(character.name||'').trim()).filter(Boolean));
        return [...new Set(current.filter(name=>!heroine.has(name)))];
      }
      function gameRouteProgress(routes,done){
        const total=[...new Set((routes||[]).map(value=>String(value||'').trim()).filter(Boolean))];
        if(!total.length)return null;
        const completed=new Set((done||[]).map(value=>String(value||'').trim()));
        return Math.round(total.filter(route=>completed.has(route)).length/total.length*100);
      }
      function renderGameRouteEditor(id,game){
        const editor=$('#gameRouteEditor');if(!editor)return;const selected=new Set(gameRouteNames(game)),source=Array.isArray(game.sourceCharacters)?game.sourceCharacters:(Array.isArray(game.chars)?game.chars:[]);
        const options=source.map(character=>{const name=String(character.name||'').trim();if(!name)return '';const role=gameCharacterRole(character),label={heroine:'女主角',target:'攻略角色',main:'主角',support:'配角',other:'未分类'}[role];return `<label class="game-route-option"><input type="checkbox" data-route-option value="${safe(name)}" ${selected.has(name)?'checked':''}><span>${safe(name)}</span><small>${label}</small></label>`}).filter(Boolean).join('');
        const custom=[...selected].filter(name=>!source.some(character=>String(character.name||'').trim()===name));
        editor.innerHTML=`<div class="game-route-editor-list">${options||'<span class="playing-meta">暂无可用的角色资料，可直接新增路线。</span>'}</div><div class="game-route-custom">${custom.map(name=>`<label class="game-route-option"><input type="checkbox" data-route-option value="${safe(name)}" checked><span>${safe(name)}</span><small>自定义</small></label>`).join('')}<div class="game-route-add"><input type="text" data-route-new placeholder="新增角色 / 路线"><button class="product-button secondary small" type="button" data-route-add>添加</button></div></div><div class="game-route-editor-actions"><button class="product-button" type="button" data-route-all-done>全部角色全通</button><button class="product-button" type="button" data-route-save>保存路线</button><button class="product-button secondary small" type="button" data-route-cancel>取消</button></div>`;
        editor.hidden=false;editor.querySelector('[data-route-add]').onclick=()=>{const input=editor.querySelector('[data-route-new]'),name=input.value.trim();if(!name)return;const wrap=editor.querySelector('.game-route-custom'),row=document.createElement('label');row.className='game-route-option';row.innerHTML=`<input type="checkbox" data-route-option value="${safe(name)}" checked><span>${safe(name)}</span><small>自定义</small>`;wrap.insertBefore(row,wrap.querySelector('.game-route-add'));input.value=''};editor.querySelector('[data-route-all-done]').onclick=()=>editor.querySelectorAll('[data-route-option]').forEach(input=>{input.checked=true});editor.querySelector('[data-route-cancel]').onclick=()=>{editor.hidden=true};editor.querySelector('[data-route-save]').onclick=()=>{const routes=[...new Set([...editor.querySelectorAll('[data-route-option]:checked')].map(input=>input.value.trim()).filter(Boolean))],done=(Array.isArray(game.routeDone)?game.routeDone:[]).filter(route=>routes.includes(route)),progress=gameRouteProgress(routes,done);saveGamePatch(id,{routes,routeDone:done,progress:progress==null?game.progress:progress,routeSelectionCustomized:true})};
      }

      function renderLegacyGameDetail(id){
        let game=games().find(g=>String(g.id)===String(id));if(!game)return;
        if(!$('#libraryBrowseView').hidden){
          libraryBrowseScrollY=window.scrollY||document.documentElement.scrollTop||0;
        }
        localStorage.setItem('amoristUi.libraryRoute.v1',JSON.stringify({screen:'detail',id:String(id)}));
        window.AmoristLibraryUI?.showDetail?.();
        const routes=gameRouteNames(game);
        const done=Array.isArray(game.routeDone)?game.routeDone:[];
        const calculatedProgress=gameRouteProgress(routes,done);
        if(calculatedProgress!=null&&Number(game.progress)!==calculatedProgress){const rows=games(),index=rows.findIndex(row=>row.id===id);if(index>=0){rows[index]={...rows[index],progress:calculatedProgress};saveGames(rows);game={...game,progress:calculatedProgress};}}
        const storedTimeEvents=readTimelineEvents().map(normalizeTimelineEvent).filter(event=>event.gameId===String(game.id)&&['started','completed','session'].includes(event.type));
        const derived=['started','completed'].map(type=>{const existing=storedTimeEvents.find(event=>event.type===type),date=type==='started'?game.startedAt:game.completedAt;if(!existing&&!date)return null;return normalizeTimelineEvent({...existing,id:existing?.id||timelineGameEventId(game.id,type),gameId:game.id,type,occurredAt:date||existing?.occurredAt||'',datePrecision:date?'day':existing?.datePrecision||'unknown',title:timelineTypeLabel(type)})}).filter(Boolean);
        const sessionEvents=storedTimeEvents.filter(e=>e.type==='session');
        const timeEvents=[...derived,...sessionEvents].sort((a,b)=>eventSortValue(b)-eventSortValue(a));
        const logRowsHtml=timeEvents.length?timeEvents.map(event=>`<div class="game-log game-log-public"><time>${safe(timelineDateLabel(event))}</time><span>${safe(timelineTypeLabel(event.type))}</span>${window.AMORIST_MODE==='editor'?`<button class="game-log-delete" type="button" data-time-event="${safe(event.id)}">编辑</button>`:''}</div>`).join(''):'<span class="playing-meta">还没有游玩日志，去时间线添加日常游玩记录吧。</span>';
        $('#gameDetailPanel').innerHTML=`
          <section class="game-detail-hero"><button class="game-detail-back" type="button">返回游戏档案</button><div class="game-detail-cover">${game.cover?`<img src="${safe(game.cover)}" alt="${safe(game.name)}" referrerpolicy="no-referrer">`:safe(initial(game.name))}</div><div class="game-detail-copy"><div class="card-eyebrow">${safe(game.status)} · ${safe(game.platform||'平台未记录')}</div><h2>${safe(game.name)}</h2><p>${safe(game.note||'这部作品还没有写下一句话记录。')}</p><div class="game-detail-actions"><button class="product-button" type="button" data-detail-action="repo">REPO</button>${window.AMORIST_MODE==='editor'?'<button class="product-button secondary" type="button" data-detail-action="edit">编辑档案</button>':''}</div></div></section>
          <div class="game-detail-grid"><section class="product-card game-detail-section"><h3>作品进度</h3><div class="detail-stats"><div class="detail-stat"><span>PROGRESS</span><strong>${Number(game.progress)||0}%</strong></div><div class="detail-stat"><span>PLAY TIME</span><strong>${Number(game.hours)||0}h</strong></div><div class="detail-stat"><span>MY RATING</span><strong>${Number(game.rating)?Number(game.rating).toFixed(1):'—'} / 5</strong></div></div><div class="section-head game-route-head"><h3>角色路线</h3>${window.AMORIST_MODE==='editor'?'<button class="product-button secondary small" data-detail-action="edit-routes" type="button">编辑角色</button>':''}</div><div class="route-list">${routes.length?routes.map(route=>window.AMORIST_MODE==='editor'?`<button class="route-chip ${done.includes(route)?'done':''}" data-route="${safe(route)}" type="button">${done.includes(route)?'已通 ':''}${safe(route)}</button>`:`<span class="route-chip ${done.includes(route)?'done':''}">${done.includes(route)?'已通 ':''}${safe(route)}</span>`).join(''):'<span class="playing-meta">作品资料中没有可记录通关的主角。</span>'}</div>${window.AMORIST_MODE==='editor'?'<div id="gameRouteEditor" class="game-route-editor" hidden></div>':''}</section><section class="product-card game-detail-section"><div class="section-head"><h3>游玩日志</h3>${window.AMORIST_MODE==='editor'?'<button class="product-button secondary small" data-detail-action="log" type="button">记录时间</button>':''}</div><div class="game-log-list">${logRowsHtml}</div></section></div><section class="product-card game-detail-section game-source-section" id="gameSourceInfo"><div class="section-head"><h3>作品资料</h3><span class="playing-meta">来自作品资料库</span></div><div class="playing-meta">正在读取作品资料…</div></section>`;
        [...$('#gameDetailPanel').querySelectorAll('.detail-stat')].find(stat=>stat.querySelector('span')?.textContent==='MY RATING')?.remove();
         $('#gameDetailPanel .game-detail-back').onclick=()=>{localStorage.removeItem('amoristUi.libraryRoute.v1');window.AmoristLibraryUI?.showBrowse?.();requestAnimationFrame(()=>window.scrollTo({top:libraryBrowseScrollY,behavior:'auto'}));};
        $('#gameDetailPanel [data-detail-action="repo"]').onclick=()=>writeGameToRepo(game);
        const editGameButton=$('#gameDetailPanel [data-detail-action="edit"]');
        if(editGameButton)editGameButton.onclick=()=>window.openEnhancedGameDialog(game);
        $('#gameDetailPanel [data-detail-action="edit-routes"]')?.addEventListener('click',()=>renderGameRouteEditor(id,game));
        $('#gameDetailPanel [data-detail-action="log"]')?.remove();
        const logButton=$('#gameDetailPanel [data-detail-action="log"]');
        if(logButton){logButton.onclick=()=>window.openTimelineRecordDialog?.(id);logButton.parentElement.classList.add('game-log-head');}
        $$('#gameDetailPanel [data-time-event]').forEach(button=>button.onclick=()=>{const event=timeEvents.find(row=>row.id===button.dataset.timeEvent);if(!event)return;if(event.type==='session')window.openTimelineSessionDialog?.(event);else window.openTimelineRecordDialog?.(id,event)});
        $$('#gameDetailPanel [data-route]').forEach(btn=>btn.onclick=()=>{
          const route=btn.dataset.route,wasDone=done.includes(route),next=wasDone?done.filter(x=>x!==route):[...done,route],progress=gameRouteProgress(routes,next);
          saveGamePatch(id,{routeDone:next,progress:progress==null?game.progress:progress});
        });
        loadGameSourceInfo(game);
      }

      function renderGameDetail(id){
        let game=games().find(g=>String(g.id)===String(id));if(!game)return;
        id=game.id;
        if(!$('#libraryBrowseView').hidden)libraryBrowseScrollY=window.scrollY||document.documentElement.scrollTop||0;
        localStorage.setItem('amoristUi.libraryRoute.v1',JSON.stringify({screen:'detail',id:String(id)}));window.AmoristLibraryUI?.showDetail?.();window.scrollTo({top:0,behavior:'auto'});
        const routes=gameRouteNames(game),done=Array.isArray(game.routeDone)?game.routeDone:[],calculatedProgress=gameRouteProgress(routes,done);
        if(calculatedProgress!=null&&Number(game.progress)!==calculatedProgress){const rows=games(),index=rows.findIndex(row=>row.id===id);if(index>=0){rows[index]={...rows[index],progress:calculatedProgress};saveGames(rows);game={...game,progress:calculatedProgress};}}
        const stored=readTimelineEvents().map(normalizeTimelineEvent).filter(event=>event.gameId===String(game.id)&&['started','completed','session'].includes(event.type));
        const derived=['started','completed'].map(type=>{const existing=stored.find(event=>event.type===type),date=type==='started'?game.startedAt:game.completedAt;if(!existing&&!date)return null;return normalizeTimelineEvent({...existing,id:existing?.id||timelineGameEventId(game.id,type),gameId:game.id,type,occurredAt:date||existing?.occurredAt||'',datePrecision:date?'day':existing?.datePrecision||'unknown',title:timelineTypeLabel(type)})}).filter(Boolean);
        const dayStamp=event=>{const value=String(event?.occurredAt||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const stamp=Date.parse(`${value}T00:00:00`);return Number.isFinite(stamp)?stamp:null;};
        const isoDate=event=>String(event?.occurredAt||'').slice(0,10),compactDate=event=>{const value=isoDate(event);return /^\d{4}-\d{2}-\d{2}$/.test(value)?value.slice(5).replace('-', '.'):event?.occurredAt?timelineDateLabel(event):'未记录'},fullDate=event=>{const value=isoDate(event);return /^\d{4}-\d{2}-\d{2}$/.test(value)?value.replace(/-/g,'.'):event?.occurredAt?timelineDateLabel(event):'未记录'};
        const merged=[];stored.filter(event=>event.type==='session').sort((a,b)=>(dayStamp(a)??eventSortValue(a))-(dayStamp(b)??eventSortValue(b))).forEach(event=>{const stamp=dayStamp(event),last=merged.at(-1),lastStamp=last?.dates.at(-1)?.stamp;if(stamp!=null&&lastStamp!=null&&stamp-lastStamp<=86400000){last.events.push(event);last.dates.push({stamp,event});}else merged.push({events:[event],dates:[{stamp,event}]});});
        const completedStamp=dayStamp(derived.find(event=>event.type==='completed')||{});
        const sessions=merged.map(group=>{const dates=[...new Map(group.dates.map(row=>[String(row.event.occurredAt).slice(0,10),row])).values()].sort((a,b)=>a.stamp-b.stamp),first=dates[0].event,last=dates.at(-1).event,count=dates.length,replay=completedStamp!=null&&(dayStamp(first)??0)>completedStamp;return {event:first,type:'session',events:group.events,label:count>1?`${timelineDateLabel(first)}—${timelineDateLabel(last)}`:timelineDateLabel(first),text:count>1?`连续游玩 ${count} 日`:replay?'再次游玩':'游玩记录',tag:count>1?'SESSION':'LOG'};});
        const chronicle=[...derived.map(event=>({event,type:event.type,events:[event],label:timelineDateLabel(event),text:timelineTypeLabel(event.type),tag:{started:'START',completed:'CLEAR'}[event.type]||'LOG'})),...sessions].sort((a,b)=>eventSortValue(b.event)-eventSortValue(a.event));
        const timeEvents=chronicle.flatMap(row=>row.events),rating=Number(game.rating)||0,stars=`${'★'.repeat(Math.max(0,Math.min(5,Math.round(rating))))}${'☆'.repeat(Math.max(0,5-Math.round(rating)))}`,routeTotal=routes.length,routeDone=done.filter(route=>routes.includes(route)).length,startedLabel=derived.find(event=>event.type==='started')?.occurredAt?timelineDateLabel(derived.find(event=>event.type==='started')):'未记录',completedLabel=derived.find(event=>event.type==='completed')?.occurredAt?timelineDateLabel(derived.find(event=>event.type==='completed')):'未记录',archiveNo=String(game.bangumiId||game.id||'').replace(/\D/g,'').slice(-6).padStart(6,'0');
        const sourceCharacters=Array.isArray(game.sourceCharacters)?game.sourceCharacters:[],findCharacter=route=>sourceCharacters.find(character=>[character.name,character.nameCn,character.nameJp,character.title].filter(Boolean).some(value=>String(value).trim()===String(route).trim()));
        const routeHtml=routes.length?routes.map(route=>{const character=findCharacter(route),image=character?.image||character?.images?.large||character?.images?.medium||character?.images?.grid||game.cover||'',subtitle=character?.nameCn||character?.nameJp||character?.alt||'',clear=done.includes(route);return `<div class="route-strip ${clear?'':'off'}"><div class="route-avatar">${image?`<img src="${safe(image)}" alt="${safe(route)}" referrerpolicy="no-referrer">`:safe(initial(route))}</div><div class="route-copy"><b>${safe(route)}</b>${subtitle?`<small>${safe(subtitle)}</small>`:''}</div><div class="route-state"><em>${clear?'CLEAR':'OPEN'}</em></div>${window.AMORIST_MODE==='editor'?`<button class="route-toggle" data-route="${safe(route)}" type="button" aria-label="切换 ${safe(route)} 路线状态">切换</button>`:''}</div>`}).join(''):'<span class="playing-meta">作品资料中没有可记录通关的主角。</span>';
        let chronicleYear='';const logHtml=chronicle.length?chronicle.map(row=>{const year=String(row.event.occurredAt||'').slice(0,4),yearHtml=year&&year!==chronicleYear?(chronicleYear=year,`<div class="chronicle-year">${safe(year)}</div>`):'';return `${yearHtml}<div class="log ${row.type==='completed'?'clear':''}"><time>${safe(row.label)}</time><span>${safe(row.text)}</span><em>${safe(row.tag)}</em></div>`}).join(''):'<span class="playing-meta">还没有游玩日志，去时间线添加日常游玩记录吧。</span>';
        $('#gameDetailPanel').innerHTML=`<button class="game-detail-back" type="button">← 返回游戏档案</button><article class="archive"><section class="hero"><div class="cover-stage"><div class="game-detail-cover">${game.cover?`<img src="${safe(game.cover)}" alt="${safe(game.name)}" referrerpolicy="no-referrer">`:safe(initial(game.name))}</div></div><div class="hero-copy"><div class="archive-no">ARCHIVE NO. ${archiveNo}</div><h1>${safe(game.name)}</h1><p class="jp-title">${safe(game.nameJp||game.nameAlt||game.nameOriginal||'')}</p><dl class="meta"><dt>发售日期</dt><dd>${safe(game.releaseDate||game.year||'未记录')}</dd><dt>开发商</dt><dd>${safe(game.developer||'未记录')}</dd><dt>游戏平台</dt><dd>${safe(game.platform||'未记录')}</dd><dt>游玩状态</dt><dd><span class="status-dot"></span>${safe(game.status||'尚未分类')}</dd><dt>攻略路线</dt><dd>${routeTotal} 条</dd></dl><div class="rating"><span>MY RATING</span><div class="stars">${stars}</div></div><p class="note">${safe(game.note||'这部作品还没有写下一句话记录。')}</p><div class="actions"><button type="button" data-detail-action="repo">OPEN REPO</button>${window.AMORIST_MODE==='editor'?'<button class="secondary" type="button" data-detail-action="edit">EDIT ARCHIVE</button>':''}</div></div><aside class="chronicle"><div class="chronicle-head"><h2>游玩编年</h2><small>PLAY CHRONICLE</small></div><div class="quick-stats"><div><span>START DATE</span><strong>${safe(startedLabel)}</strong></div><div><span>CLEAR DATE</span><strong>${safe(completedLabel)}</strong></div><div><span>PLAY TIME</span><strong>${game.hours?`${Number(game.hours)}h`:'未记录'}</strong></div></div><div class="chronicle-list">${logHtml}</div>${window.AMORIST_MODE==='editor'?'<button class="product-button secondary small chronicle-log-button" data-detail-action="log" type="button">记录时间</button>':''}</aside></section><section class="story-flow"><div class="progress"><div class="progress-label">ROUTE PROGRESS</div><strong>${routeDone} / ${routeTotal}</strong><span>${routeTotal&&routeDone===routeTotal?'ALL CLEAR':routeTotal?`${Math.round(routeDone/routeTotal*100)}% COMPLETE`:'NO ROUTES'}</span><i></i></div><div class="route-chapter"><div class="section-head"><h2>路线进度</h2><small>CHARACTER ROUTES</small>${window.AMORIST_MODE==='editor'?'<button class="product-button secondary small" data-detail-action="edit-routes" type="button">编辑角色</button>':''}</div><div class="route-list">${routeHtml}</div>${window.AMORIST_MODE==='editor'?'<div id="gameRouteEditor" class="game-route-editor" hidden></div>':''}</div></section></article><section class="product-card game-detail-section game-source-section" id="gameSourceInfo"><div class="section-head"><h3>作品资料</h3><span class="playing-meta">来自作品资料库</span></div><div class="playing-meta">正在读取作品资料…</div></section>`;
        const sourceSection=$('#gameSourceInfo'),detailActions=$('#gameDetailPanel .actions');detailActions?.insertAdjacentHTML('beforeend','<button class="secondary" type="button" data-detail-action="source">GAME DETAILS</button>');sourceSection?.insertAdjacentHTML('afterend','<button class="game-source-close" type="button" data-detail-action="close-source" aria-label="关闭作品资料">×</button>');const closeSource=()=>{sourceSection?.classList.remove('is-modal-open');$('#gameDetailPanel .game-source-close')?.classList.remove('is-visible')};$('#gameDetailPanel [data-detail-action="source"]')?.addEventListener('click',()=>{sourceSection?.classList.add('is-modal-open');$('#gameDetailPanel .game-source-close')?.classList.add('is-visible')});$('#gameDetailPanel [data-detail-action="close-source"]')?.addEventListener('click',closeSource);
        const logDates=$$('#gameDetailPanel .chronicle-list .log time');chronicle.forEach((row,index)=>{const log=logDates[index]?.closest('.log');if(log&&(row.type==='started'||row.type==='completed'))log.classList.add('log-important');const time=logDates[index];if(!time)return;const first=row.events[0]||row.event,last=row.events.at(-1)||row.event;time.textContent=row.events.length>1?`${compactDate(first)}—${compactDate(last)}`:compactDate(row.event)});const quickStats=$$('#gameDetailPanel .quick-stats strong');if(quickStats[0])quickStats[0].textContent=fullDate(derived.find(event=>event.type==='started'));if(quickStats[1])quickStats[1].textContent=fullDate(derived.find(event=>event.type==='completed'));const chronicleTitle=$('#gameDetailPanel .chronicle h2');if(chronicleTitle)chronicleTitle.textContent='游玩日志';
        $('#gameDetailPanel .game-detail-back').onclick=()=>{localStorage.removeItem('amoristUi.libraryRoute.v1');window.AmoristLibraryUI?.showBrowse?.();requestAnimationFrame(()=>window.scrollTo({top:libraryBrowseScrollY,behavior:'auto'}));};$('#gameDetailPanel [data-detail-action="repo"]').onclick=()=>writeGameToRepo(game);
        const editGameButton=$('#gameDetailPanel [data-detail-action="edit"]');if(editGameButton)editGameButton.onclick=()=>window.openEnhancedGameDialog(game);$('#gameDetailPanel [data-detail-action="edit-routes"]')?.addEventListener('click',()=>renderGameRouteEditor(id,game));
        const logButton=$('#gameDetailPanel [data-detail-action="log"]');if(logButton)logButton.onclick=()=>window.openTimelineRecordDialog?.(id);$$('#gameDetailPanel [data-time-event]').forEach(button=>button.onclick=()=>{const event=timeEvents.find(row=>row.id===button.dataset.timeEvent);if(!event)return;if(event.type==='session')window.openTimelineSessionDialog?.(event);else window.openTimelineRecordDialog?.(id,event)});
        $$('#gameDetailPanel [data-route]').forEach(btn=>btn.onclick=()=>{const route=btn.dataset.route,wasDone=done.includes(route),next=wasDone?done.filter(x=>x!==route):[...done,route],progress=gameRouteProgress(routes,next);saveGamePatch(id,{routeDone:next,progress:progress==null?game.progress:progress});});loadGameSourceInfo(game);
      }

      function gameSourceValue(value){
        if(value==null)return '';
        if(Array.isArray(value))return value.map(gameSourceValue).filter(Boolean).join(' / ');
        if(typeof value==='object')return value.v||value.k||value.name||'';
        return String(value);
      }
      async function loadGameSourceInfo(game){
        const host=$('#gameSourceInfo'); if(!host)return;
        try{
          const rows=await new Promise((resolve,reject)=>{const req=indexedDB.open('amorist-bangumi-db',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('games'),q=tx.objectStore('games').getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error)}});
          const currentSource=rows.find(item=>String(item.id)===String(game.bangumiId));
          if(game.bangumiId&&!game.bangumiVersionCheckedAt&&window.amoristBangumiDiscovery?.resolveById){
            try{
              const resolved=await window.amoristBangumiDiscovery.resolveById(game.bangumiId);
              if(resolved){
                const patch={bangumiDisplayId:String(game.bangumiId),bangumiCharacterSourceId:resolved.characterSourceId||game.bangumiCharacterSourceId||'',bangumiVersionCheckedAt:resolved.versionResolveCheckedAt||Date.now(),cover:currentSource?.cover||game.cover,sourceCharacters:resolved.chars||game.sourceCharacters||[]};
                saveGamePatch(game.id,patch);game={...game,...patch};
              }
            }catch{}
          }
          const sourceIds=[game.bangumiId,game.bangumiCharacterSourceId].filter(Boolean).map(String);
          const source=rows.find(item=>sourceIds.includes(String(item.id)))||rows.find(item=>item.name===game.name||item.nameCn===game.name||item.nameAlt===game.name);
          if(source){const meta=$$('#gameDetailPanel .hero-copy .meta dd'),release=source.date||source.year,developer=source.developer||'';if(meta[0]&&release&&!game.releaseDate&&!game.year)meta[0].textContent=release;if(meta[1]&&developer&&!game.developer)meta[1].textContent=developer;}
          if(!source){host.innerHTML='<div class="section-head"><h3>作品资料</h3><span class="playing-meta">来自作品资料库</span></div><div class="playing-meta">这部游戏尚未关联作品资料库。可在作品资料库中导入后自动关联。</div>';return;}
          const infobox=Array.isArray(source.infobox)?source.infobox:[];
          const sourceRows=infobox.map(row=>`<div class="game-source-row"><strong>${safe(row.key||'')}</strong><span>${safe(gameSourceValue(row.value))}</span></div>`).join('');
          const staff=[source.developer&&`开发/制作：${source.developer}`,...(source.writers||[]).map(w=>`剧本：${w}`)].filter(Boolean);
          const chars=Array.isArray(source.chars)?source.chars:[];
          const roleGroup=gameCharacterRole;
          const charCard=character=>{
            const image=character.image||character.images?.large||character.images?.medium||character.images?.grid||'';
            const relation=character.relation||character.role||character.role_name||'';
            return `<div class="game-source-char"><div class="game-source-char-avatar">${image?`<img loading="lazy" referrerpolicy="no-referrer" src="${safe(image)}" alt="" onerror="this.style.display='none'">`:safe(character.name||'?').slice(0,1)}</div><div><div class="game-source-char-name">${safe(character.name||'未命名角色')}</div><div class="game-source-char-meta">${character.cv?safe('CV '+character.cv):''}</div></div></div>`;
          };
          const charBlock=(title,list)=>list.length?`<section class="game-source-char-block"><h4>${title}</h4><div class="game-source-chars">${list.map(charCard).join('')}</div></section>`:'';
          const groups={heroine:[],target:[],main:[],support:[],other:[]};
          chars.forEach(character=>groups[roleGroup(character)].push(character));
          const primaryCharacters=groups.target.length?groups.target:groups.main;
          if((!Array.isArray(game.sourceCharacters)||!game.sourceCharacters.length)&&primaryCharacters.length){
            saveGamePatch(game.id,{sourceCharacters:chars,routes:primaryCharacters.map(character=>character.name).filter(Boolean)});
            return;
          }
          const explicit=groups.heroine.length||groups.target.length;
          const charactersHtml=explicit
            ?charBlock('女主角',groups.heroine)+charBlock('攻略对象',groups.target)+charBlock('其他主角',groups.main)+charBlock('配角',groups.support)+charBlock('其他角色',groups.other)
            :groups.main.length||groups.support.length
              ?charBlock('主角',groups.main)+charBlock('配角',groups.support)+charBlock('其他角色',groups.other)
              :charBlock('角色',chars);
          host.innerHTML='<div class="section-head"><h3>作品资料</h3><span class="playing-meta">来自作品资料库</span></div>'
            +`<div class="game-source-layout"><div class="game-source-copy"><div class="game-source-meta">${[source.nameCn||source.nameAlt||source.name,source.year?source.year+'年':'',...staff].filter(Boolean).map(x=>`<span>${safe(x)}</span>`).join('')}</div>`
            +(source.desc?`<p class="game-source-desc">${safe(source.desc)}</p>`:'')
            +(sourceRows?`<h4>制作与作品信息</h4><div class="game-source-infobox">${sourceRows}</div>`:'')
            +`</div><div class="game-source-characters">${charactersHtml||'<div class="playing-meta">暂无角色数据</div>'}</div></div>`;
        }catch{host.innerHTML='<div class="section-head"><h3>作品资料</h3></div><div class="playing-meta">暂时无法读取作品资料库。</div>';}
      }

      document.addEventListener('click',event=>{
        const card=event.target.closest('#gameSourceInfo .game-source-char');
        if(!card)return;
        const name=card.querySelector('.game-source-char-name')?.textContent?.trim();
        if(!name)return;
        let rows=[];
        try{const value=JSON.parse(localStorage.getItem('amorist-character-book-v1')||'[]');rows=Array.isArray(value)?value:[]}catch{}
        const record=rows.find(item=>item.name===name||item.nameCn===name);
        const characterId=record?.bangumiCharacterId||record?.id;
        if(!characterId)return;
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent('amorist-open-character',{detail:characterId}));
      });
      /* Visual sheets */
      const visualTemplates={
        grid:{title:'我的九部心选',slots:9},
        tier:{title:'乙游作品 Tier',slots:15},
        contrast:{title:'盲狙与真爱',slots:6},
        mood:{title:'我的乙游属性',slots:3}
      };
      let activeVisual='',activeAssetIndex=-1;
      function visualStore(){try{return JSON.parse(localStorage.getItem(VISUAL_KEY)||'{}')||{}}catch{return{}}}
      function visualState(){const all=visualStore(),def=visualTemplates[activeVisual];return all[activeVisual]||{title:def?.title||'',slots:Array.from({length:def?.slots||0},()=>null),notes:['喜欢的声优、角色属性与关系性。','最偏爱的世界观与剧情氛围。']}}
      function saveVisual(state){const all=visualStore();all[activeVisual]=state;localStorage.setItem(VISUAL_KEY,JSON.stringify(all))}
      function slotHtml(item,index,extra=''){
        return `<div class="visual-slot ${extra}" data-visual-slot="${index}">${item?`${item.cover?`<img src="${safe(item.cover)}" alt="${safe(item.name)}" referrerpolicy="no-referrer">`:`<div class="slot-empty">${safe(initial(item.name))}</div>`}<input value="${safe(item.label||item.name)}" aria-label="图片说明">`:'<div class="slot-empty">＋</div>'}</div>`;
      }
      function renderVisual(){
        if(!activeVisual)return;const state=visualState();$('#activeFormTitle').value=state.title;const slots=state.slots||[];let html='';
        if(activeVisual==='grid')html=`<div class="visual-grid-canvas">${Array.from({length:9},(_,i)=>slotHtml(slots[i],i)).join('')}</div>`;
        if(activeVisual==='tier')html=`<div class="tier-canvas">${['S','A','B','C','D'].map((rank,row)=>`<div class="tier-row"><div class="tier-label">${rank}</div><div class="tier-items">${[0,1,2].map(col=>{const i=row*3+col,item=slots[i];return `<div class="tier-item" data-visual-slot="${i}">${item?(item.cover?`<img src="${safe(item.cover)}" alt="${safe(item.name)}" referrerpolicy="no-referrer">`:safe(initial(item.name))):'＋'}</div>`}).join('')}</div></div>`).join('')}</div>`;
        if(activeVisual==='contrast')html=`<div class="contrast-canvas"><div class="contrast-column"><h3>开玩前的盲狙</h3>${[0,1,2].map(i=>slotHtml(slots[i],i,'contrast-card')).join('')}</div><div class="contrast-column"><h3>通关后的真爱</h3>${[3,4,5].map(i=>slotHtml(slots[i],i,'contrast-card')).join('')}</div></div>`;
        if(activeVisual==='mood')html=`<div class="mood-canvas"><div class="mood-visual">${slotHtml(slots[0],0)}</div><div class="mood-copy"><textarea data-note="0" placeholder="喜欢的声优、角色属性与关系性">${safe(state.notes?.[0]||'')}</textarea></div><div class="mood-copy"><textarea data-note="1" placeholder="最偏爱的世界观与剧情氛围">${safe(state.notes?.[1]||'')}</textarea></div><div class="mood-visual" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${slotHtml(slots[1],1)}${slotHtml(slots[2],2)}</div></div>`;
        $('#visualCanvas').innerHTML=html;
        $$('#visualCanvas [data-visual-slot]').forEach(slot=>slot.addEventListener('click',event=>{if(event.target.matches('input'))return;openAssetPicker(Number(slot.dataset.visualSlot))}));
        $$('#visualCanvas .visual-slot input').forEach(input=>input.addEventListener('input',event=>{event.stopPropagation();const slot=event.target.closest('[data-visual-slot]'),next=visualState();if(next.slots[slot.dataset.visualSlot])next.slots[slot.dataset.visualSlot].label=input.value;saveVisual(next)}));
        $$('#visualCanvas [data-note]').forEach(area=>area.addEventListener('input',()=>{const next=visualState();next.notes=next.notes||[];next.notes[area.dataset.note]=area.value;saveVisual(next)}));
      }
      function openVisualTemplate(id,seedGameId=''){
        if(!visualTemplates[id])return;activeVisual=id;
        $('#formTemplates').style.display='none';$('#formWorkspace').classList.add('active');$('#backToTemplates').hidden=false;
        const profile=(()=>{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')}catch{return{}}})();$('#visualSheetOwner').textContent=profile.name||'HARU';
        if(seedGameId){const state=visualState(),game=games().find(g=>g.id===seedGameId);if(game&&!state.slots[0]){state.slots[0]={gameId:game.id,name:game.name,cover:game.cover||'',label:game.name};saveVisual(state)}}
        renderVisual();
      }
      function openAssetPicker(index){
        activeAssetIndex=index;const list=$('#assetPickerList'),rows=games();
        list.innerHTML=rows.length?rows.map(game=>`<button class="asset-pick" type="button" data-asset-game="${safe(game.id)}"><div class="asset-pick-media">${game.cover?`<img src="${safe(game.cover)}" alt="${safe(game.name)}" referrerpolicy="no-referrer">`:safe(initial(game.name))}</div><span>${safe(game.name)}</span></button>`).join(''):'<div class="empty-library"><strong>游戏档案还是空的</strong>先添加游戏，再来制作图文表格。</div>';
        $('#assetPickerOverlay').classList.add('open');
      }
      function closeAssetPicker(){$('#assetPickerOverlay').classList.remove('open')}
      $('#assetPickerList').addEventListener('click',event=>{const pick=event.target.closest('[data-asset-game]');if(!pick)return;const game=games().find(g=>g.id===pick.dataset.assetGame),state=visualState();state.slots[activeAssetIndex]={gameId:game.id,name:game.name,cover:game.cover||'',label:game.name};saveVisual(state);closeAssetPicker();renderVisual()});
      const clearVisualSlot=$('#clearVisualSlot');if(clearVisualSlot)clearVisualSlot.onclick=()=>{const state=visualState();state.slots[activeAssetIndex]=null;saveVisual(state);closeAssetPicker();renderVisual()};
      const visualUploadButton=$('#visualUploadButton'),visualUploadInput=$('#visualUploadInput');
      if(visualUploadButton&&visualUploadInput)visualUploadButton.onclick=()=>visualUploadInput.click();
      if(visualUploadInput)visualUploadInput.onchange=event=>{const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{const max=600,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const state=visualState(),name=file.name.replace(/\.[^.]+$/,'');state.slots[activeAssetIndex]={name,cover:canvas.toDataURL('image/jpeg',.76),label:name};try{saveVisual(state);closeAssetPicker();renderVisual()}catch{toast('本地空间不足，请删除部分大图')}event.target.value=''};image.src=reader.result};reader.readAsDataURL(file)};
      const closeAssetPickerButton=$('#closeAssetPicker'),assetPickerOverlay=$('#assetPickerOverlay');
      if(closeAssetPickerButton)closeAssetPickerButton.onclick=closeAssetPicker;
      if(assetPickerOverlay)assetPickerOverlay.onclick=e=>{if(e.target===assetPickerOverlay)closeAssetPicker()};
      $$('#formTemplates [data-form-template]').forEach(card=>card.addEventListener('click',event=>{event.stopImmediatePropagation();openVisualTemplate(card.dataset.formTemplate)},true));
      $('#activeFormTitle').addEventListener('input',()=>{if(!activeVisual)return;const state=visualState();state.title=$('#activeFormTitle').value;saveVisual(state)});
      $('#backToTemplates').addEventListener('click',()=>{activeVisual='';$('#formTemplates').style.display='grid';$('#formWorkspace').classList.remove('active');$('#backToTemplates').hidden=true},true);
      $('#saveFormAnswers').addEventListener('click',()=>{if(activeVisual){const s=visualState();s.title=$('#activeFormTitle').value;saveVisual(s);toast('图文作品已保存')}},true);
      $('#clearFormAnswers').addEventListener('click',event=>{if(!activeVisual)return;event.stopImmediatePropagation();if(!confirm('清空当前图文画布？'))return;const all=visualStore();delete all[activeVisual];localStorage.setItem(VISUAL_KEY,JSON.stringify(all));renderVisual();toast('画布已清空')},true);

      async function exportVisual(){
        if(!activeVisual)return;const button=$('#captureFormAnswers'),old=button.textContent;button.disabled=true;button.textContent='正在生成…';
        try{if(!window.html2canvas)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});const canvas=await html2canvas($('#visualSheet'),{scale:2,useCORS:true,backgroundColor:null,logging:false});const a=document.createElement('a');a.download=`${visualState().title||'Amorist图文作品'}.png`;a.href=canvas.toDataURL('image/png');a.click();toast('图文作品已导出')}catch{toast('部分远程封面限制导出，可先换成本地图片或使用截图')}finally{button.disabled=false;button.textContent=old}
      }
      $('#captureFormAnswers').addEventListener('click',event=>{if(activeVisual){event.stopImmediatePropagation();exportVisual()}},true);

      try {
        const route=JSON.parse(localStorage.getItem('amoristUi.libraryRoute.v1')||'null');
        if (document.querySelector('[data-product-view="library"]')?.classList.contains('active') && route?.screen==='detail' && route.id) {
          setTimeout(()=>renderGameDetail(route.id),0);
        }
      } catch {}
      window.AmoristTimelineStore={read:readTimelineEvents,write:writeTimelineEvents,migrate:migrateTimelineData,normalize:normalizeTimelineEvent,name:timelineGameName,sort:eventSortValue,dateLabel:timelineDateLabel,typeLabel:timelineTypeLabel,dateValue:timelineDateValue,id:timelineId,routeId:timelineRouteEventId,sameRoute:isSameRouteEvent,canonicalize:canonicalizeTimelineEvents};
      window.AmoristGameStore={games,saveGames,gameRouteNames,gameRouteProgress,renderGameDetail};
      updateProfileArchiveStats();
    })();
;

/* ===== enhancedFeaturesScript ===== */
(() => {
      const CHAR_KEY='amorist-character-book-v1';
      const GAME_KEY='amorist-game-library-v1';
      const PROFILE_KEY='amorist-profile-v1';
      const VISUAL_KEY='amorist-visual-sheets-v1';
      const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
      const safe=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
      const initial=name=>String(name||'?').trim().slice(0,1).toUpperCase();
      const dataModel=window.AmoristDataModel;
      let bangumiRoleRows=[];
      const games=()=>{try{const rows=JSON.parse(localStorage.getItem(GAME_KEY)||'[]');return Array.isArray(rows)?rows.map(dataModel.normalizeGameRecord):[]}catch{return[]}};
      const roleGameRows=()=>bangumiRoleRows.length?[...games(),...bangumiRoleRows]:games();
      const timelineStore=window.AmoristTimelineStore;
      const TIMELINE_KEY_FALLBACK='amorist-timeline-events-v1';
      const timelineFallbackRead=()=>{try{const value=JSON.parse(localStorage.getItem(TIMELINE_KEY_FALLBACK)||'[]'),events=Array.isArray(value)?value:Array.isArray(value?.events)?value.events:[];return events.filter(event=>['started','completed','session'].includes(String(event?.type||'')))}catch{return[]}};
      const timelineFallbackWrite=events=>{localStorage.setItem(TIMELINE_KEY_FALLBACK,JSON.stringify({version:2,events:(Array.isArray(events)?events:[]).filter(event=>['started','completed','session'].includes(String(event?.type||'')))}));window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{timeline:true}}))};
      const timelineRead=()=>timelineStore?.read?.()||timelineFallbackRead();
      const timelineWrite=events=>timelineStore?.write?.(events)||timelineFallbackWrite(events);
      const timelineNormalize=event=>timelineStore?.normalize?.(event)||({...event,id:String(event?.id||`timeline-${Date.now()}`),occurredAt:String(event?.occurredAt||''),datePrecision:event?.datePrecision||'unknown'});
      const timelineGameName=id=>timelineStore?.name?.(id)||games().find(game=>String(game.id)===String(id))?.name||'未命名作品';
      const eventSortValue=event=>timelineStore?.sort?.(event)||0;
      const timelineDateLabel=event=>timelineStore?.dateLabel?.(event)||event.occurredAt||'日期待确认';
      const timelineTypeLabel=type=>timelineStore?.typeLabel?.(type)||type;
      const timelineDateValue=value=>{if(timelineStore?.dateValue)return timelineStore.dateValue(value);const text=String(value||'').trim();if(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(text))return text;const match=text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);return match?`${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`:''};
      const timelineId=prefix=>timelineStore?.id?.(prefix)||`${prefix}-${Date.now()}`;
      const timelineRouteId=(gameId,route)=>timelineStore?.routeId?.(gameId,route)||`route-completed-${encodeURIComponent(String(gameId||''))}-${encodeURIComponent(String(route||'').normalize('NFKC').trim().toLowerCase())}`;
      const sameTimelineRoute=(event,gameId,route)=>timelineStore?.sameRoute?.(event,gameId,route)??(String(event?.gameId||'')===String(gameId||'')&&['route','route_completed'].includes(String(event?.type||''))&&String(event?.route||'').normalize('NFKC').trim().toLowerCase()===String(route||'').normalize('NFKC').trim().toLowerCase());
      const readTimelineEvents=timelineRead,writeTimelineEvents=timelineWrite,normalizeTimelineEvent=timelineNormalize;
      const saveGames=window.AmoristGameStore?.saveGames||((rows)=>localStorage.setItem(GAME_KEY,JSON.stringify(rows))),gameRouteNames=window.AmoristGameStore?.gameRouteNames||((game)=>Array.isArray(game?.routes)?game.routes:[]),gameRouteProgress=window.AmoristGameStore?.gameRouteProgress||((routes,done)=>{const all=[...(routes||[])].filter(Boolean);return all.length?Math.round(new Set(done||[]).size/all.length*100):null}),renderGameDetail=window.AmoristGameStore?.renderGameDetail;
      const chars=()=>{try{const rows=JSON.parse(localStorage.getItem(CHAR_KEY)||'[]');const cleaned=Array.isArray(rows)?rows.filter(character=>character?.gameId||(!character?.animeId&&!Array.isArray(character?.animeIds))):[];if(Array.isArray(rows)&&cleaned.length!==rows.length)localStorage.setItem(CHAR_KEY,JSON.stringify(cleaned));const gameRows=roleGameRows();return cleaned.map(character=>dataModel.normalizeCharacterRecord(character,gameRows))}catch{return[]}};
      const visibleChars=(rows=chars(),gameRows=games())=>window.AmoristCharacterBookVisibility.filter(rows,gameRows);
      const saveChars=v=>localStorage.setItem(CHAR_KEY,JSON.stringify((Array.isArray(v)?v:[]).map(character=>dataModel.normalizeCharacterRecord(character,roleGameRows()))));
      const go=view=>document.querySelector(`[data-product-target="${view}"]`)?.click();
      const toast=msg=>{const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2200)};
      const characterHasBirthday=character=>Array.isArray(character?.infobox)&&character.infobox.some(row=>/生日|誕生日|birth/i.test(String(row?.key||''))&&String(row?.value??'').trim()!=='');
      const BIRTHDAY_BACKFILL_SESSION_KEY='amorist-character-birthday-backfill-session-v1';
      const mergeCharacterInfobox=(current,incoming)=>{
        const rows=Array.isArray(current)?current.map(row=>({...row})):[];
        (Array.isArray(incoming)?incoming:[]).forEach(row=>{
          const key=String(row?.key||'');if(!key)return;
          const index=rows.findIndex(existing=>String(existing?.key||'')===key);
          if(index<0)rows.push(row);
          else if(!String(rows[index]?.value??'').trim()&&String(row?.value??'').trim())rows[index]=row;
        });
        return rows;
      };
      async function fetchCharacterDetailForBirthday(id){
        const response=await fetch('https://api.bgm.tv/v0/characters/'+encodeURIComponent(id),{headers:{Accept:'application/json'}});
        if(!response.ok)throw new Error('Bangumi '+response.status);
        return response.json();
      }
      async function enrichCharacterBirthday(character){
        if(!character?.bangumiCharacterId||characterHasBirthday(character)||character.birthdayCheckedAt)return character;
        const detail=await fetchCharacterDetailForBirthday(character.bangumiCharacterId);
        character.infobox=mergeCharacterInfobox(character.infobox,detail.infobox);
        character.birthdayCheckedAt=Date.now();
        return character;
      }
      let birthdayBackfillRunning=false;
      async function backfillCharacterBirthdays(){
        if(birthdayBackfillRunning||sessionStorage.getItem(BIRTHDAY_BACKFILL_SESSION_KEY)==='1')return;
        sessionStorage.setItem(BIRTHDAY_BACKFILL_SESSION_KEY,'1');
        const rows=chars(),targets=rows.filter(character=>character.bangumiCharacterId&&!characterHasBirthday(character)&&!character.birthdayCheckedAt);
        if(!targets.length)return;
        birthdayBackfillRunning=true;
        let completed=0;
        try{
          for(let index=0;index<targets.length;index+=4){
            const batch=targets.slice(index,index+4);
            const updatedCharacters=[];
            await Promise.all(batch.map(async character=>{
              try{await enrichCharacterBirthday(character);updatedCharacters.push(character);}catch{}
              completed++;
            }));
            if(updatedCharacters.length){
              const current=chars();
              updatedCharacters.forEach(updated=>{
                const target=current.find(row=>String(row.id)===String(updated.id));
                if(target){target.infobox=updated.infobox;target.birthdayCheckedAt=updated.birthdayCheckedAt;}
              });
              saveChars(current);
            }
            if(completed<targets.length)await new Promise(resolve=>setTimeout(resolve,180));
          }
          window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{chars:true}}));
        }finally{birthdayBackfillRunning=false;}
      }
      window.searchBangumiCharacters=window.searchBangumiCharacters||async function(keyword){
        const q=String(keyword||'').trim();if(!q)return[];
        const r=await fetch('https://api.bgm.tv/v0/search/characters?limit=20&offset=0',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({keyword:q,sort:'match'})});
        if(!r.ok)throw new Error('HTTP '+r.status);
        const json=await r.json();return Array.isArray(json.data)?json.data:[];
      };

      /* ══════ Character Book ══════ */
      let activeCharRoleFilter='all';
      let activeCharPreferenceFilter='all';
      let charBatchMode=false;
      const charSelected=new Set();
      const characterPreferenceOrder=dataModel.CHARACTER_PREFERENCES.map(item=>item.id);
      const characterPreferenceAxisByRole={
        all:characterPreferenceOrder,
        route:['favorite','oshi','like','good','curious','normal','difficult','unclassified'],
        protagonist:['like','good','curious','normal','difficult','unclassified'],
        sub:['like','good','curious','normal','difficult','excluded','unclassified']
      };
      function populateGameSelect(){
        const sel=$('#charGame');if(!sel)return;
        const rows=games().filter(game=>window.AmoristCharacterBookVisibility.visibleStatuses.has(String(game.status||'').trim()));
        sel.innerHTML='<option value="">— 选择作品 —</option>'+rows.map(g=>`<option value="${safe(g.id)}">${safe(g.name)}</option>`).join('');
      }
      function characterCachedSearchText(character,gameName=''){
        const values=[];
        const append=value=>{
          if(value==null)return;
          if(Array.isArray(value)){value.forEach(append);return;}
          if(typeof value==='object'){Object.values(value).forEach(append);return;}
          values.push(String(value));
        };
        append(character.name);append(character.nameCn);append(character.name_cn);append(character.cnName);append(character.chineseName);
        append(character.aliases);append(character.infobox);append(character.cv);append(character.note);append(gameName);
        return values.join(' ').normalize('NFKC').toLowerCase();
      }
      function renderCharacterBook(query=''){
        const gameRows=games(),all=visibleChars(chars(),gameRows),gameMap=Object.fromEntries(gameRows.map(g=>[g.id,g]));
        const normalized=query.trim().normalize('NFKC').toLowerCase();
        const filtered=all.filter(c=>{
          if(activeCharRoleFilter!=='all'&&c.roleType!==activeCharRoleFilter)return false;
          if(activeCharPreferenceFilter==='all'){
            if(c.preference==='excluded')return false;
          }else if(c.preference!==activeCharPreferenceFilter)return false;
          if(normalized){
            const workName=gameMap[c.gameId]?.name||'';
            if(!characterCachedSearchText(c,workName).includes(normalized))return false;
          }
          return true;
        });
        const grid=$('#characterGrid');
        $('#charCountText').textContent=`${filtered.length} 位角色`;
        const bestCount=all.filter(c=>c.preference==='favorite').length;
        const workIds=new Set(all.map(c=>c.gameId).filter(Boolean));
        $('#charTotalCount').textContent=all.length;
        $('#charBestCount').textContent=bestCount;
        $('#charGameCount').textContent=workIds.size;
        const useTimeline=!normalized&&activeCharPreferenceFilter==='all'&&activeCharRoleFilter!=='unset';
        grid.classList.toggle('character-preference-timeline',useTimeline);
        grid.classList.toggle('library-rank-axis',useTimeline);
        if(!filtered.length){
          grid.innerHTML='<div class="empty-library"><strong>没有符合条件的角色</strong>可以更换身份或喜好筛选；対象外只会在单独筛选时显示。</div>';
          return;
        }
        const sorted=filtered.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
        const cardMarkup=c=>{
           const game=gameMap[c.gameId],workName=game?.name||'未知作品';
           const quickActions=window.AMORIST_MODE==='editor'
             ? '<div class="char-quick-actions"><button class="char-quick-btn" data-char-action="edit" title="编辑角色档案">✎</button></div>'
             : '';
           return `<article class="char-card${charBatchMode?' batch-mode':''}" data-char-id="${safe(c.id)}" tabindex="0">
             ${charBatchMode?`<input class="batch-select" type="checkbox" data-batch-char="${safe(c.id)}" ${charSelected.has(String(c.id))?'checked':''} aria-label="选择${safe(c.name)}">`:''}
             ${quickActions}
            <div class="char-cover">${c.image?`<img src="${safe(c.image)}" alt="${safe(c.name)}" referrerpolicy="no-referrer">`:safe(initial(c.name))}</div>
            <div class="char-card-body"><strong>${safe(c.nameCn||c.name)}</strong><span class="char-game-name">${safe(workName)}</span></div>
          </article>`;
        };
        if(useTimeline){
          const axis=characterPreferenceAxisByRole[activeCharRoleFilter]||characterPreferenceOrder;
          grid.innerHTML=axis.map((category,index)=>{
            const rows=sorted.filter(c=>c.preference===category);
            const label=dataModel.characterPreferenceLabel(category);
            const categoryCode=String(category).replace(/_/g,' ').toUpperCase();
            return `<section class="character-preference-group library-rank-tier" data-tier="${safe(category)}" data-preference-level="${index}"><header><span>${String(index+1).padStart(2,'0')}</span><h3>${safe(label)}</h3><small>${safe(categoryCode)}</small><em>${rows.length} characters</em></header><div class="character-preference-cards library-rank-track">${rows.length?rows.map(cardMarkup).join(''):'<span class="character-preference-empty library-rank-empty">暂无角色</span>'}</div></section>`;
          }).join('');
        }else{
          grid.innerHTML=sorted.map(cardMarkup).join('');
        }
        $$('#characterGrid .char-card').forEach(card=>{
          card.addEventListener('click',e=>{
            if(charBatchMode){
              if(e.target.closest('[data-char-action]'))return;
              const checkbox=e.target.closest('[data-batch-char]'),id=card.dataset.charId;
              if(checkbox){checkbox.checked=charSelected.has(id);return;}
              if(charSelected.has(id))charSelected.delete(id);else charSelected.add(id);
              renderCharacterBook($('#charSearchInput')?.value||'');updateCharBatchCount();return;
            }
            const action=e.target.closest('[data-char-action]');
            if(action?.dataset.charAction==='edit'){e.stopPropagation();openCharDialog(card.dataset.charId);return;}
            const record=chars().find(c=>String(c.id)===String(card.dataset.charId));
            if(record?.bangumiCharacterId){window.dispatchEvent(new CustomEvent('amorist-open-character',{detail:record.bangumiCharacterId}));return;}
            openCharDialog(card.dataset.charId);
          });
          const checkbox=card.querySelector('[data-batch-char]');
          checkbox?.addEventListener('click',e=>{e.stopPropagation();const id=card.dataset.charId;if(checkbox.checked)charSelected.add(id);else charSelected.delete(id);updateCharBatchCount()});
        });
      }
      window.renderCharacterBook=renderCharacterBook;
      function updateCharBatchCount(){const el=$('#charSelectedCount');if(el)el.textContent=charSelected.size}
      function paintCharacterSearchResults(rows){
        const host=$('#charSearchResults');if(!host)return;
        if(!rows.length){host.innerHTML='<span class="playing-meta">没有找到角色，换个名字试试。</span>';return;}
        host.innerHTML=rows.map(c=>{
          const image=c.images&&(c.images.grid||c.images.small||c.images.medium||c.images.large)||'';
          const actor=Array.isArray(c.actors)&&c.actors[0]?.name||'';
          return `<button class="char-search-result" type="button" data-bangumi-search-char="${safe(c.id)}"><span class="char-search-result-avatar">${image?`<img src="${safe(image)}" alt="" referrerpolicy="no-referrer">`:safe(initial(c.name))}</span><span><strong>${safe(c.name||'未命名角色')}</strong><small>${safe(c.name_cn||'')}${actor?' · CV '+safe(actor):''}</small></span><em>生成主页 →</em></button>`;
        }).join('');
      }
      async function fetchCharacterSearch(keyword){
        const q=String(keyword||'').trim();if(!q)return[];
        const r=await fetch('https://api.bgm.tv/v0/search/characters?limit=20&offset=0',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({keyword:q,sort:'match'})});
        if(!r.ok)throw new Error('HTTP '+r.status);
        const json=await r.json();return Array.isArray(json.data)?json.data:[];
      }
      async function searchCharacterOnBangumi(){
        const input=$('#charSearchKeyword'),host=$('#charSearchResults');if(!input||!host)return;
        const q=input.value.trim();if(!q){host.innerHTML='<span class="playing-meta">请输入角色名。</span>';return;}
        host.innerHTML='<span class="playing-meta">正在搜索 Bangumi…</span>';
        try{paintCharacterSearchResults(await fetchCharacterSearch(q));}
        catch(e){host.innerHTML='<span class="playing-meta">搜索失败：'+safe(e.message)+'</span>';}
      }
      async function createCharacterFromBangumi(c){
        const all=chars(),existing=all.find(x=>String(x.bangumiCharacterId||'')===String(c.id));
        const image=c.images&&(c.images.large||c.images.medium||c.images.grid||c.images.small)||'';
        const cv=Array.isArray(c.actors)&&c.actors[0]?.name||'';
        let subjectIds=[...(Array.isArray(existing?.bangumiSubjectIds)?existing.bangumiSubjectIds:[]),existing?.bangumiSubjectId].filter(Boolean).map(String);
        try{
          const subjects=await v0('/v0/characters/'+encodeURIComponent(c.id)+'/subjects');
          subjectIds.push(...(Array.isArray(subjects)?subjects:[]).filter(subject=>Number(subject?.type)===4).map(subject=>String(subject.id)));
        }catch{}
        if(bgSelected?.id)subjectIds.push(String(bgSelected.id));
        subjectIds=[...new Set(subjectIds)];
        const gameRows=games();
        const eligibleGames=gameRows.filter(game=>window.AmoristCharacterBookVisibility.visibleStatuses.has(String(game.status||'').trim()));
        const preferredSubjectId=String(bgSelected?.id||'')&&subjectIds.includes(String(bgSelected.id))?String(bgSelected.id):subjectIds.find(subjectId=>eligibleGames.some(game=>String(game.bangumiId||game.bangumiDisplayId||'')===subjectId))||existing?.bangumiSubjectId||subjectIds[0]||'';
        const linkedGame=eligibleGames.find(game=>String(game.bangumiId||game.bangumiDisplayId||'')===preferredSubjectId)||eligibleGames.find(game=>subjectIds.includes(String(game.bangumiId||game.bangumiDisplayId||'')));
        if(!linkedGame){toast('请先将所属游戏设为「进行中」或「已全通」');return;}
        const record=dataModel.normalizeCharacterRecord({...(existing||{}),id:existing?.id||`char-bgm-${c.id}`,name:c.name||'未命名角色',nameCn:c.name_cn||existing?.nameCn||'',aliases:existing?.aliases||[],gameId:linkedGame.id,gameIds:[...new Set([...(Array.isArray(existing?.gameIds)?existing.gameIds:[]),existing?.gameId,linkedGame.id].filter(Boolean))],bangumiCharacterId:c.id,bangumiSubjectId:preferredSubjectId,bangumiSubjectIds:subjectIds,preference:dataModel.normalizeCharacterPreference(existing?.preference??existing?.relation),roleType:existing?.roleType||'unset',roleTypeSource:existing?.roleTypeSource||'bangumi',cv:existing?.cv||cv,image:existing?.image||image,note:existing?.note||'',summary:existing?.summary||'',infobox:existing?.infobox||[],nameSearchSynced:Boolean(c.name_cn||existing?.nameSearchSynced),updatedAt:Date.now()},gameRows);
        try{await enrichCharacterBirthday(record);}catch{}
        const i=all.findIndex(x=>x.id===record.id);if(i>=0)all[i]=record;else all.push(record);
        saveChars(all);closeCharDialog();renderCharacterBook($('#charSearchInput')?.value||'');toast('角色主页已生成');
        setTimeout(()=>window.dispatchEvent(new CustomEvent('amorist-open-character',{detail:c.id})),80);
      }
      function openCharDialog(id=''){
        populateGameSelect();
        const char=chars().find(c=>String(c.id)===String(id));
        const searchMode=!char;
        $('#charDialogTitle').textContent=char?'编辑角色':'从 Bangumi 添加角色';
        $('#charSearchPanel').hidden=!searchMode;
        $('#charManualFields').hidden=searchMode;
        $('#charManualActions').hidden=searchMode;
        $('#editingCharId').value=char?.id||'';
        $('#charName').value=char?.name||'';
        $('#charGame').value=char?.gameId||'';
        $('#charRoleType').value=char?.roleType||'unset';
        $('#charPreference').value=char?.preference||'unclassified';
        $('#charRoleTypeSourceHint').textContent=char?(`身份来源：${char.roleTypeSource==='manual'?'手动设置':'Bangumi 映射'}`):'';
        $('#charCV').value=char?.cv||'';
        $('#charImage').value=char?.image||'';
        $('#charNote').value=char?.note||'';
        if(searchMode){$('#charSearchKeyword').value='';$('#charSearchResults').innerHTML='<span class="playing-meta">搜索后选择角色，系统会自动生成角色主页。</span>';}
        $('#deleteCharButton').hidden=!char;
        $('#charDialogOverlay').classList.add('open');
        setTimeout(()=>$(searchMode?'#charSearchKeyword':'#charName').focus(),30);
      }
      function closeCharDialog(){$('#charDialogOverlay').classList.remove('open')}
      $('#addCharButton').addEventListener('click',()=>openCharDialog());
      $('#closeCharDialog').addEventListener('click',closeCharDialog);
      $('#charDialogOverlay').addEventListener('click',e=>{if(e.target===$('#charDialogOverlay'))closeCharDialog()});
      $('#charUploadButton').onclick=()=>$('#charUploadInput').click();
      $('#charUploadInput').onchange=event=>{
        const file=event.target.files?.[0];if(!file)return;
        const reader=new FileReader();
        reader.onload=()=>{
          const image=new Image();
          image.onload=()=>{
            const max=480,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
            canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
            canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
            $('#charImage').value=canvas.toDataURL('image/jpeg',.74);toast('本地图片已加载');
          };image.src=reader.result;
        };reader.readAsDataURL(file);event.target.value='';
      };
      $('#charDialogForm').addEventListener('submit',e=>{
        e.preventDefault();
        const all=chars(),id=$('#editingCharId').value;
        const previous=all.find(c=>c.id===id)||{};
        const selectedRole=dataModel.normalizeCharacterRoleType($('#charRoleType').value);
        const previousRole=dataModel.normalizeCharacterRoleType(previous.roleType);
        const roleTypeSource=id?(previous.roleTypeSource==='manual'||selectedRole!==previousRole?'manual':(previous.roleTypeSource||'bangumi')):'manual';
        const record=dataModel.normalizeCharacterRecord({...previous,id:id||`char-${Date.now()}`,name:$('#charName').value.trim(),gameId:$('#charGame').value,preference:$('#charPreference').value,roleType:selectedRole,roleTypeSource,cv:$('#charCV').value.trim(),image:$('#charImage').value.trim(),note:$('#charNote').value.trim(),updatedAt:Date.now()},games());
        const i=all.findIndex(c=>String(c.id)===String(id));
        if(i>=0)all[i]=record;else all.push(record);
        saveChars(all);closeCharDialog();renderCharacterBook($('#charSearchInput')?.value||'');toast('角色已保存');
      });
      $('#charSearchButton').addEventListener('click',searchCharacterOnBangumi);
      $('#charSearchKeyword').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchCharacterOnBangumi();}});
      $('#charSearchResults').addEventListener('click',async e=>{
        const button=e.target.closest('[data-bangumi-search-char]');if(!button)return;
        const rows=await fetchCharacterSearch($('#charSearchKeyword').value.trim());
        const selected=rows.find(c=>String(c.id)===String(button.dataset.bangumiSearchChar));
        if(selected)createCharacterFromBangumi(selected);
      });
      $('#deleteCharButton').addEventListener('click',()=>{
        const id=$('#editingCharId').value,char=chars().find(c=>String(c.id)===String(id));
        if(!char||!confirm(`删除角色「${char.name}」？`))return;
        saveChars(chars().filter(c=>String(c.id)!==String(id)));closeCharDialog();renderCharacterBook($('#charSearchInput')?.value||'');toast('角色已删除');
      });
      $('#charSearchInput')?.addEventListener('input',e=>renderCharacterBook(e.target.value));
      $$('#charRoleFilters .filter-pill').forEach(btn=>btn.addEventListener('click',()=>{
        activeCharRoleFilter=btn.dataset.charRoleFilter||'all';
        $$('#charRoleFilters .filter-pill').forEach(b=>b.classList.toggle('active',b===btn));
        renderCharacterBook($('#charSearchInput')?.value||'');
      }));
      $$('#charPreferenceFilters .filter-pill').forEach(btn=>btn.addEventListener('click',()=>{
        activeCharPreferenceFilter=btn.dataset.charPreferenceFilter||'all';
        $$('#charPreferenceFilters .filter-pill').forEach(b=>b.classList.toggle('active',b===btn));
        renderCharacterBook($('#charSearchInput')?.value||'');
      }));

      /* ══════ Timeline ══════ */
      window.renderTimeline=renderTimeline;
      window.openTimelineRecordDialog=openTimelineRecordDialog;
      window.openTimelineSessionDialog=openTimelineSessionDialog;
      window.openTimelineBatchImportDialog=openTimelineBatchImportDialog;

      /* Structured timeline UI */
      timelineStore?.migrate?.();
      let timelineState={type:'all',game:'all',year:'all',unknown:true,view:'calendar',calendarMonth:(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`})()};
      const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
      function openTimelineRecordDialog(gameId){const game=games().find(row=>String(row.id)===String(gameId));if(!game)return;go('library');setTimeout(()=>openEnhancedGameDialog(game),0)}
      function openTimelineSessionDialog(seedEvent){
        const existing=seedEvent?readTimelineEvents().find(row=>row.id===seedEvent.id):null;
        const rows=games();
        if(!rows.length){toast('请先在游戏档案里添加一部作品');go('library');return;}
        const overlay=document.createElement('div');
        overlay.className='product-overlay open';
        overlay.setAttribute('role','dialog');
        overlay.setAttribute('aria-modal','true');
        overlay.innerHTML=`<form class="product-dialog"><div class="product-dialog-head"><h2>${existing?'编辑游玩记录':'记录今日游玩'}</h2><button class="product-dialog-close" type="button" aria-label="关闭">×</button></div><div class="product-dialog-grid"><div class="editor-group wide"><label for="timelineSessionGame">游玩作品</label><select class="product-select" id="timelineSessionGame" required>${rows.map(g=>`<option value="${safe(g.id)}"${existing&&String(existing.gameId)===String(g.id)?' selected':''}>${safe(g.name)}</option>`).join('')}</select></div><div class="editor-group"><label for="timelineSessionDate">日期</label><input class="product-input" id="timelineSessionDate" type="date" required value="${safe(existing?.occurredAt||localDate())}"></div><div class="editor-group wide"><label for="timelineSessionNote">备注（可选）</label><textarea class="product-textarea" id="timelineSessionNote" maxlength="120" placeholder="今天玩了什么、推进到哪">${safe(existing?.note||'')}</textarea></div></div><div class="product-dialog-actions">${existing?'<button class="product-button danger" type="button" id="timelineSessionDelete">删除</button>':''}<button class="product-button secondary" type="button" id="timelineSessionCancel">取消</button><button class="product-button rose" type="submit">保存</button></div></form>`;
        document.body.appendChild(overlay);
        const close=()=>{overlay.remove();};
        overlay.querySelector('.product-dialog-close').onclick=close;
        overlay.querySelector('#timelineSessionCancel').onclick=close;
        overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
        if(existing){overlay.querySelector('#timelineSessionDelete').onclick=()=>{if(!confirm('删除这条游玩记录？'))return;writeTimelineEvents(readTimelineEvents().filter(row=>row.id!==existing.id));close();renderTimeline();toast('已删除游玩记录');};}
        overlay.querySelector('form').addEventListener('submit',e=>{
          e.preventDefault();
          const gameId=overlay.querySelector('#timelineSessionGame').value;
          const date=overlay.querySelector('#timelineSessionDate').value;
          const note=overlay.querySelector('#timelineSessionNote').value.trim();
          if(!gameId||!date){toast('请选择作品和日期');return;}
          const id=existing?.id||timelineId('session');
          const next=readTimelineEvents().filter(row=>row.id!==id);
          next.push(normalizeTimelineEvent({id,gameId,type:'session',occurredAt:date,datePrecision:'day',title:timelineTypeLabel('session'),note,source:'manual'}));
          writeTimelineEvents(next);
          close();renderTimeline();
          toast(existing?'游玩记录已更新':'已记录今日游玩');
        });
      }
      function openTimelineBatchImportDialog(){
        const rows=games();
        if(!rows.length){toast('请先在游戏档案里添加作品');go('library');return;}
        const overlay=document.createElement('div');
        overlay.className='product-overlay open';
        overlay.setAttribute('role','dialog');
        overlay.setAttribute('aria-modal','true');
        const gameOptions=rows.map(g=>`<option value="${safe(g.id)}">${safe(g.name)}</option>`).join('');
        overlay.innerHTML=`<form class="product-dialog" style="max-width:780px"><div class="product-dialog-head"><h2>批量导入游玩记录</h2><button class="product-dialog-close" type="button" aria-label="关闭">×</button></div><div class="product-dialog-grid"><div class="editor-group wide"><label for="batchImportText">粘贴表格（每行一条：游戏名 + 日期，Tab 或逗号分隔，可直接从 Excel 复制两列）</label><textarea class="product-textarea" id="batchImportText" rows="8" placeholder="璃梦泡影之世外浮城,2025-08-21&#10;Honey Vibes,2026-04-06"></textarea></div><div class="editor-group wide" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="button" class="product-button secondary" id="batchParseBtn">解析预览</button><span id="batchParseHint" class="playing-meta"></span></div><div class="editor-group wide" id="batchPreviewWrap" hidden><label>预览（红色行未匹配，请下拉选择对应游戏，或选「跳过」略过该行）</label><div id="batchPreviewTable" class="batch-preview-table"></div><div class="product-dialog-actions"><button type="button" class="product-button rose" id="batchImportBtn">导入选中记录</button></div></div></div></form>`;
        document.body.appendChild(overlay);
        const close=()=>overlay.remove();
        overlay.querySelector('.product-dialog-close').onclick=close;
        overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
        const norm=s=>String(s||'').normalize('NFKC').trim().toLowerCase();
        const gameMap={};rows.forEach(g=>{gameMap[norm(g.name)]=g;});
        const parseDate=v=>{const s=String(v||'').trim();const m=s.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:''};
        overlay.querySelector('#batchParseBtn').onclick=()=>{
          const text=overlay.querySelector('#batchImportText').value.trim();
          if(!text){toast('请先粘贴表格');return;}
          const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
          const parsed=[];
          lines.forEach(line=>{
            const parts=line.split(/\t|,|，/).map(p=>p.trim()).filter(Boolean);
            if(parts.length<2)return;
            let name='',date='';
            for(const p of parts){const d=parseDate(p);if(d&&!date)date=d;else if(!name)name=p;}
            if(name&&date)parsed.push({name,date});
          });
          if(!parsed.length){overlay.querySelector('#batchParseHint').textContent='未解析到有效行（需含游戏名和日期）';return;}
          parsed.forEach(r=>{r.game=gameMap[norm(r.name)]||null;r.gameId=r.game?.id||'';});
          const matched=parsed.filter(r=>r.game).length;
          overlay.querySelector('#batchParseHint').textContent=`解析 ${parsed.length} 行 · 已匹配 ${matched} · 待选 ${parsed.length-matched}`;
          const table=overlay.querySelector('#batchPreviewTable');
          table.innerHTML=`<div class="batch-row batch-row-head"><span>原文游戏名</span><span>日期</span><span>对应游戏</span></div>`+parsed.map((r,i)=>`<div class="batch-row ${r.game?'':'batch-row-unmatched'}"><span class="batch-cell-name">${safe(r.name)}</span><span>${safe(r.date)}</span><select class="product-select batch-game-select" data-batch-idx="${i}"><option value="">跳过</option>${gameOptions}</select></div>`).join('');
          parsed.forEach((r,i)=>{if(r.game){const sel=table.querySelector(`[data-batch-idx="${i}"]`);if(sel)sel.value=r.gameId;}});
          overlay.querySelector('#batchPreviewWrap').hidden=false;
          overlay.querySelector('#batchImportBtn').onclick=()=>{
            const sels=[...table.querySelectorAll('.batch-game-select')];
            const existing=new Set(readTimelineEvents().map(e=>e.id));
            const toAdd=[];
            sels.forEach((sel,i)=>{const gid=sel.value;if(!gid)return;const r=parsed[i];const eid=`session-import-${gid}-${r.date}`;if(existing.has(eid))return;existing.add(eid);toAdd.push(normalizeTimelineEvent({id:eid,gameId:gid,type:'session',occurredAt:r.date,datePrecision:'day',title:timelineTypeLabel('session'),note:'',source:'batch-import'}));});
            if(!toAdd.length){toast('没有可导入的新记录（可能都已存在或全部跳过）');return;}
            writeTimelineEvents([...readTimelineEvents(),...toAdd]);
            close();renderTimeline();
            toast(`已导入 ${toAdd.length} 条游玩记录`);
          };
        };
      }
      function timelineControlHtml(gameRows,events){const years=[...new Set(events.map(e=>String(e.occurredAt||'').slice(0,4)).filter(Boolean))].sort().reverse();return `<div class="timeline-toolbar"><select class="product-select" id="timelineTypeFilter"><option value="all">全部时间</option><option value="started">开始游玩</option><option value="completed">游戏全通</option><option value="session">游玩记录</option></select><select class="product-select" id="timelineGameFilter"><option value="all">所有游戏</option>${gameRows.map(g=>`<option value="${safe(g.id)}">${safe(g.name)}</option>`).join('')}</select><select class="product-select" id="timelineYearFilter"><option value="all">全部年份</option>${years.map(year=>`<option>${year}</option>`).join('')}</select><label class="timeline-check"><input type="checkbox" id="timelineUnknownFilter" ${timelineState.unknown?'checked':''}>包含日期不确定</label></div>`}
      function renderTimeline(){const host=$('#timelineContent');if(!host)return;const gameRows=games(),all=readTimelineEvents().map(normalizeTimelineEvent).filter(event=>['started','completed'].includes(event.type));if(!['all','started','completed'].includes(timelineState.type))timelineState.type='all';const filtered=all.filter(event=>(timelineState.type==='all'||event.type===timelineState.type)&&(timelineState.game==='all'||String(event.gameId)===String(timelineState.game))&&(timelineState.year==='all'||String(event.occurredAt).startsWith(timelineState.year))&&(timelineState.unknown||event.datePrecision!=='unknown'));const groups={};filtered.sort((a,b)=>eventSortValue(b)-eventSortValue(a)).forEach(event=>{const key=event.datePrecision==='unknown'?'日期待确认':String(event.occurredAt||'').slice(0,7)||'日期待确认';(groups[key]??=[]).push(event)});const body=Object.entries(groups).map(([key,events])=>`<div class="timeline-month"><div class="timeline-month-head"><h3>${safe(key)}</h3><span>${events.length} 条记录</span></div>${events.map(event=>{const game=gameRows.find(row=>String(row.id)===String(event.gameId)),name=game?.name||timelineGameName(event.gameId),cover=game?.cover||'';return `<article class="timeline-entry timeline-event-card${event.type==='session'?' is-session':''}" data-timeline-event="${safe(event.id)}" data-game-id="${safe(event.gameId)}"><div class="timeline-date">${safe(timelineDateLabel(event))}</div><div class="timeline-body"><div class="timeline-cover">${cover?`<img src="${safe(cover)}" alt="${safe(name)}" referrerpolicy="no-referrer">`:safe(initial(name))}</div><div class="timeline-text"><strong>${safe(name)}</strong><span class="timeline-badge ${safe(event.type)}">${safe(timelineTypeLabel(event.type))}</span>${window.AMORIST_MODE==='editor'?`<div class="timeline-event-actions"><button type="button" data-timeline-edit="${safe(event.id)}">编辑</button><button type="button" data-timeline-delete="${safe(event.id)}">删除</button></div>`:''}</div></div></article>`}).join('')}</div>`).join('');host.innerHTML=timelineControlHtml(gameRows,all)+(body||'<div class="timeline-empty"><strong>还没有游玩时间</strong><p>时间线只记录游戏的开始游玩时间和全通时间。</p></div>');$('#timelineTypeFilter').value=timelineState.type;$('#timelineTypeFilter').onchange=e=>{timelineState.type=e.target.value;renderTimeline()};$('#timelineGameFilter').value=timelineState.game;$('#timelineGameFilter').onchange=e=>{timelineState.game=e.target.value;renderTimeline()};$('#timelineYearFilter').value=timelineState.year;$('#timelineYearFilter').onchange=e=>{timelineState.year=e.target.value;renderTimeline()};$('#timelineUnknownFilter').onchange=e=>{timelineState.unknown=e.target.checked;renderTimeline()};const backfillButton=$('#timelineBackfillOpen');if(backfillButton)backfillButton.onclick=()=>openTimelineBackfill(gameRows[0]?.id);host.querySelectorAll('[data-timeline-edit]').forEach(button=>button.onclick=e=>{e.stopPropagation();const event=all.find(row=>row.id===button.dataset.timelineEdit);if(event)openTimelineRecordDialog(event.gameId,event)});host.querySelectorAll('[data-timeline-delete]').forEach(button=>button.onclick=e=>{e.stopPropagation();if(!confirm('删除这条时间线记录？'))return;writeTimelineEvents(readTimelineEvents().filter(row=>row.id!==button.dataset.timelineDelete));renderTimeline()});host.querySelectorAll('.timeline-event-card').forEach(card=>card.onclick=e=>{if(e.target.closest('button'))return;const id=card.dataset.gameId;go('library');setTimeout(()=>renderGameDetail(id),0)})}

      function timelineControlHtml(gameRows,events){
        const years=[...new Set(events.map(e=>String(e.occurredAt||'').slice(0,4)).filter(Boolean))].sort().reverse();
        return `<div class="timeline-toolbar"><div class="timeline-view-switch" role="group" aria-label="时间线视图"><button type="button" class="timeline-view-button ${timelineState.view==='list'?'active':''}" data-timeline-view="list">时间线</button><button type="button" class="timeline-view-button ${timelineState.view==='calendar'?'active':''}" data-timeline-view="calendar">日历</button></div><select class="product-select" id="timelineTypeFilter"><option value="all">全部时间</option><option value="started">开始游玩</option><option value="completed">游戏全通</option><option value="session">游玩记录</option></select><select class="product-select" id="timelineGameFilter"><option value="all">所有游戏</option>${gameRows.map(g=>`<option value="${safe(g.id)}">${safe(g.name)}</option>`).join('')}</select><select class="product-select" id="timelineYearFilter"><option value="all">全部年份</option>${years.map(year=>`<option>${year}</option>`).join('')}</select><label class="timeline-check"><input type="checkbox" id="timelineUnknownFilter" ${timelineState.unknown?'checked':''}>包含日期不确定</label></div>`;
      }
      function timelineControlHtml(gameRows,events){
        const years=[...new Set(events.map(e=>String(e.occurredAt||'').slice(0,4)).filter(Boolean))].sort().reverse();
        return `<div class="timeline-toolbar"><span class="timeline-filter-label">EVENT</span><select class="product-select" id="timelineTypeFilter"><option value="all">全部</option><option value="started">开始</option><option value="completed">全通</option><option value="session">普通记录</option></select><select class="product-select" id="timelineGameFilter"><option value="all">所有作品</option>${gameRows.map(g=>`<option value="${safe(g.id)}">${safe(g.name)}</option>`).join('')}</select><select class="product-select" id="timelineYearFilter"><option value="all">全部年份</option>${years.map(year=>`<option>${year}</option>`).join('')}</select><label class="timeline-check"><input type="checkbox" id="timelineUnknownFilter" ${timelineState.unknown?'checked':''}>包含日期不确定</label><div class="timeline-view-switch" role="group" aria-label="时间线视图"><button type="button" class="timeline-view-button ${timelineState.view==='list'?'active':''}" data-timeline-view="list">时间线</button><button type="button" class="timeline-view-button ${timelineState.view==='calendar'?'active':''}" data-timeline-view="calendar">日历</button></div></div>`;
      }
      function timelineCalendarHtml(gameRows,events){
        const [year,month]=timelineState.calendarMonth.split('-').map(Number),firstDay=(new Date(year,month-1,1).getDay()+6)%7,daysInMonth=new Date(year,month,0).getDate(),cells=[];
        for(let index=0;index<firstDay;index++)cells.push('<div class="timeline-calendar-day is-empty" aria-hidden="true"></div>');
        for(let day=1;day<=daysInMonth;day++){
          const key=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,dayEvents=events.filter(event=>event.occurredAt===key),today=localDate()===key;
          const cards=dayEvents.map(event=>{const game=gameRows.find(row=>String(row.id)===String(event.gameId)),name=game?.name||timelineGameName(event.gameId),cover=game?.cover||'';return `<button type="button" class="timeline-calendar-event" data-event-type="${safe(event.type)}" data-calendar-game="${safe(event.gameId)}" title="${safe(name)} · ${safe(timelineTypeLabel(event.type))}">${cover?`<img src="${safe(cover)}" alt="${safe(name)}" loading="lazy" referrerpolicy="no-referrer">`:`<span class="timeline-calendar-fallback">${safe(initial(name))}</span>`}<span>${safe(name)}</span><small>${safe(timelineTypeLabel(event.type))}</small></button>`}).join('');
          cells.push(`<div class="timeline-calendar-day ${today?'is-today':''}"><span class="timeline-calendar-number">${day}</span><div class="timeline-calendar-events">${cards}</div></div>`);
        }
        const monthLabel=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long'}).format(new Date(year,month-1,1));
        return `<section class="timeline-calendar" aria-label="${safe(monthLabel)}日历"><header class="timeline-calendar-head"><div><span class="section-kicker">CALENDAR VIEW</span><h2>${safe(monthLabel)}</h2></div><div class="timeline-calendar-actions"><button type="button" class="product-button secondary small" data-calendar-today>本月</button><button type="button" class="timeline-calendar-nav" data-calendar-prev aria-label="上个月">‹</button><button type="button" class="timeline-calendar-nav" data-calendar-next aria-label="下个月">›</button></div></header><div class="timeline-calendar-weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div class="timeline-calendar-grid">${cells.join('')}</div>${events.length?'':'<p class="timeline-calendar-empty">这个筛选条件下还没有游玩记录。</p>'}</section>`;
      }
      function timelineCalendarHtml(gameRows,events){
        const [year,month]=timelineState.calendarMonth.split('-').map(Number),firstDay=(new Date(year,month-1,1).getDay()+6)%7,daysInMonth=new Date(year,month,0).getDate(),cells=[];
        const grouped=new Map();
        events.filter(event=>/^\d{4}-\d{2}-\d{2}$/.test(String(event.occurredAt||''))).forEach(event=>{
          const key=`${event.occurredAt}|${event.gameId}`;
          const group=grouped.get(key)||{gameId:String(event.gameId),date:event.occurredAt,events:[]};
          group.events.push(event);grouped.set(key,group);
        });
        const dayGroups=new Map();[...grouped.values()].forEach(group=>{const list=dayGroups.get(group.date)||[];list.push(group);dayGroups.set(group.date,list);});
        const badge=type=>type==='started'?'START':type==='completed'?'CLEAR':'LOG';
        const badgeClass=type=>type==='started'?'begin':type==='completed'?'clear':'log';
        const eventCard=group=>{const game=gameRows.find(row=>String(row.id)===group.gameId),name=game?.name||timelineGameName(group.gameId),cover=game?.cover||'',badges=[...new Map(group.events.filter(event=>event.type!=='session').map(event=>[event.type,event])).values()].map(event=>`<span class="timeline-calendar-badge ${badgeClass(event.type)}">${badge(event.type)}</span>`).join('');return `<button type="button" class="timeline-calendar-event" data-calendar-game="${safe(group.gameId)}" title="${safe(name)}">${cover?`<img src="${safe(cover)}" alt="${safe(name)}" loading="lazy" referrerpolicy="no-referrer">`:`<span class="timeline-calendar-fallback">${safe(initial(name))}</span>`}<span class="timeline-calendar-event-name">${safe(name)}</span>${badges?`<span class="timeline-calendar-badges">${badges}</span>`:''}</button>`};
        for(let index=0;index<firstDay;index++)cells.push('<div class="timeline-calendar-day is-empty" aria-hidden="true"></div>');
        for(let day=1;day<=daysInMonth;day++){
          const key=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,groupsForDay=dayGroups.get(key)||[],visible=groupsForDay.slice(0,3),extra=groupsForDay.length-3,today=localDate()===key;
          cells.push(`<div class="timeline-calendar-day ${today?'is-today':''}"><span class="timeline-calendar-number">${day}</span><div class="timeline-calendar-events">${visible.map((group,index)=>eventCard(group).replace('timeline-calendar-event"','timeline-calendar-event timeline-calendar-event-'+index+'"')).join('')}${extra>0?`<span class="timeline-calendar-more">+${extra}</span>`:''}</div></div>`);
        }
        const monthLabel=new Intl.DateTimeFormat('en-US',{month:'short'}).format(new Date(year,month-1,1)).toUpperCase();
        return `<section class="timeline-calendar" aria-label="${safe(monthLabel)} ${year} calendar"><aside class="timeline-calendar-aside"><span class="timeline-calendar-month-number">${String(month).padStart(2,'0')}</span><strong>${safe(monthLabel)}</strong><small>${year}</small><i></i><p>留下日期、封面与状态。作品名在需要时出现。</p><dl><div><dt>ACTIVE DAYS</dt><dd>${new Set(events.map(event=>event.occurredAt).filter(Boolean)).size}</dd></div><div><dt>GAMES</dt><dd>${new Set(events.map(event=>String(event.gameId))).size}</dd></div><div><dt>CLEAR</dt><dd>${events.filter(event=>event.type==='completed').length}</dd></div></dl></aside><div class="timeline-calendar-main"><header class="timeline-calendar-head"><div class="timeline-calendar-month-title"><span>CALENDAR</span><strong>${safe(monthLabel)} ${year}</strong></div><div class="timeline-calendar-actions"><button type="button" class="timeline-calendar-nav" data-calendar-prev aria-label="上个月">‹</button><button type="button" class="timeline-calendar-nav" data-calendar-next aria-label="下个月">›</button></div></header><div class="timeline-calendar-weekdays"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div><div class="timeline-calendar-grid">${cells.join('')}</div></div></section>`;
      }
      function renderTimeline(){
        const host=$('#timelineContent');if(!host)return;const gameRows=games(),all=readTimelineEvents().map(normalizeTimelineEvent).filter(event=>['started','completed','session'].includes(event.type));
        const filtered=all.filter(event=>(timelineState.type==='all'||timelineState.type===event.type)&&(timelineState.game==='all'||String(event.gameId)===String(timelineState.game))&&(timelineState.year==='all'||String(event.occurredAt).startsWith(timelineState.year))&&(timelineState.unknown||event.datePrecision!=='unknown'));
        if($('#timelineActiveDays'))$('#timelineActiveDays').textContent=String(new Set(filtered.map(event=>String(event.occurredAt||'').slice(0,10)).filter(Boolean)).size);if($('#timelineRecordCount'))$('#timelineRecordCount').textContent=String(filtered.length);const topAdd=$('#timelineSessionAddTop');if(topAdd)topAdd.onclick=()=>openTimelineSessionDialog();const topBatch=$('#timelineBatchImportTop');if(topBatch)topBatch.onclick=()=>openTimelineBatchImportDialog();
        const groups={};filtered.slice().sort((a,b)=>eventSortValue(b)-eventSortValue(a)).forEach(event=>{const key=event.datePrecision==='unknown'?'日期待确认':String(event.occurredAt||'').slice(0,7)||'日期待确认';(groups[key]??=[]).push(event)});
        const body=Object.entries(groups).map(([key,events])=>`<div class="timeline-month"><div class="timeline-month-head"><h3>${safe(key)}</h3><span>${events.length} 条记录</span></div>${events.map(event=>{const game=gameRows.find(row=>String(row.id)===String(event.gameId)),name=game?.name||timelineGameName(event.gameId),cover=game?.cover||'';return `<article class="timeline-entry timeline-event-card${event.type==='session'?' is-session':''}" data-timeline-event="${safe(event.id)}" data-game-id="${safe(event.gameId)}"><div class="timeline-date">${safe(timelineDateLabel(event))}</div><div class="timeline-body"><div class="timeline-cover">${cover?`<img src="${safe(cover)}" alt="${safe(name)}" referrerpolicy="no-referrer">`:safe(initial(name))}</div><div class="timeline-text"><strong>${safe(name)}</strong><span class="timeline-badge ${safe(event.type)}">${safe(timelineTypeLabel(event.type))}</span>${window.AMORIST_MODE==='editor'?`<div class="timeline-event-actions"><button type="button" data-timeline-edit="${safe(event.id)}">编辑</button><button type="button" data-timeline-delete="${safe(event.id)}">删除</button></div>`:''}</div></div></article>`}).join('')}</div>`).join('');
        const sessionAddHtml=window.AMORIST_MODE==='editor'?'<div class="timeline-session-add"><button type="button" class="product-button rose small" id="timelineSessionAdd">＋ 记录今日游玩</button><button type="button" class="product-button secondary small" id="timelineBatchImport">批量导入</button></div>':'';
        host.innerHTML=sessionAddHtml+timelineControlHtml(gameRows,all)+(timelineState.view==='calendar'?timelineCalendarHtml(gameRows,filtered):(body||'<div class="timeline-empty"><strong>还没有游玩时间</strong><p>在游戏档案里记录开始与全通，或用上方按钮记一笔日常游玩。</p></div>'));
        // Calendar is the only public timeline surface; filters and list-view controls are intentionally omitted.
        host.querySelector('[data-calendar-prev]')?.addEventListener('click',()=>{const [y,m]=timelineState.calendarMonth.split('-').map(Number),d=new Date(y,m-2,1);timelineState.calendarMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;renderTimeline()});
        host.querySelector('[data-calendar-next]')?.addEventListener('click',()=>{const [y,m]=timelineState.calendarMonth.split('-').map(Number),d=new Date(y,m,1);timelineState.calendarMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;renderTimeline()});
        host.querySelector('[data-calendar-today]')?.addEventListener('click',()=>{timelineState.calendarMonth=localDate().slice(0,7);renderTimeline()});
        host.querySelectorAll('[data-timeline-edit]').forEach(button=>button.onclick=e=>{e.stopPropagation();const event=all.find(row=>row.id===button.dataset.timelineEdit);if(!event)return;if(event.type==='session')openTimelineSessionDialog(event);else openTimelineRecordDialog(event.gameId,event)});host.querySelectorAll('[data-timeline-delete]').forEach(button=>button.onclick=e=>{e.stopPropagation();if(!confirm('删除这条时间线记录？'))return;writeTimelineEvents(readTimelineEvents().filter(row=>row.id!==button.dataset.timelineDelete));renderTimeline()});
        $('#timelineSessionAdd')?.addEventListener('click',()=>openTimelineSessionDialog());
        $('#timelineBatchImport')?.addEventListener('click',()=>openTimelineBatchImportDialog());
        const openGame=id=>{go('library');setTimeout(()=>renderGameDetail(id),0)};host.querySelectorAll('.timeline-event-card').forEach(card=>card.onclick=e=>{if(e.target.closest('button'))return;openGame(card.dataset.gameId)});host.querySelectorAll('[data-calendar-game]').forEach(button=>button.onclick=()=>openGame(button.dataset.calendarGame));
      }

      function timelineControlHtml(){return '';}
      window.renderTimeline=renderTimeline;
      if(decodeURIComponent(location.hash.replace(/^#\/?/,'').split('/')[0]||'')==='timeline')setTimeout(()=>window.amoristProductNavigate?.('timeline',false),0);

      /* ══════ New Visual Templates ══════ */
      const newVisualTemplates={
        char9:{title:'我的角色九宫格',slots:9,source:'chars'},
        pref:{title:'角色偏好表',slots:12,source:'chars'},
        custom:{title:'自定义表格',slots:6,source:'mixed'},
        attr:{title:'我的乙游属性卡',slots:8,source:'mixed'}
      };
      function visualStore(){try{return JSON.parse(localStorage.getItem(VISUAL_KEY)||'{}')||{}}catch{return{}}}
      function newVisualState(){const all=visualStore(),def=newVisualTemplates[window._activeVisual];return all[window._activeVisual]||{title:def?.title||'',slots:Array.from({length:def?.slots||0},()=>null),notes:['喜欢的声优与角色属性','最偏爱的世界观'],layout:'3col'}}
      function newSaveVisual(state){const all=visualStore();all[window._activeVisual]=state;localStorage.setItem(VISUAL_KEY,JSON.stringify(all))}

      function renderNewVisual(){
        const id=window._activeVisual;if(!newVisualTemplates[id])return;
        const state=newVisualState(),slots=state.slots||[],canvas=$('#visualCanvas');
        $('#activeFormTitle').value=state.title;
        const profile=(()=>{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')}catch{return{}}})();
        $('#visualSheetOwner').textContent=profile.name||'HARU';

        function slotHtml(item,index,cssClass=''){
          const cls=cssClass||({char9:'char-nine-slot',pref:'pref-table-slot',custom:'custom-table-cell',attr:'visual-slot'}[id]||'visual-slot');
          if(item){
            return `<div class="${cls}" data-visual-slot="${index}">${item.cover?`<img src="${safe(item.cover)}" alt="${safe(item.name||'')}" referrerpolicy="no-referrer">`:`<div class="slot-empty">${safe(initial(item.name))}</div>`}<div class="slot-label"><input value="${safe(item.label||item.name||'')}" aria-label="说明"></div></div>`;
          }
          return `<div class="${cls}" data-visual-slot="${index}"><div class="slot-empty">＋</div></div>`;
        }

        if(id==='char9'){
          canvas.innerHTML=`<div class="char-nine-grid">${Array.from({length:9},(_,i)=>slotHtml(slots[i],i)).join('')}</div>`;
        }else if(id==='pref'){
          canvas.innerHTML=`<div class="pref-table-canvas"><div class="pref-table-head"><textarea data-note="0" placeholder="最好感的角色类型与属性">${safe(state.notes?.[0]||'')}</textarea><textarea data-note="1" placeholder="最无感的角色类型与属性">${safe(state.notes?.[1]||'')}</textarea></div><div class="pref-table-body">${Array.from({length:12},(_,i)=>slotHtml(slots[i],i)).join('')}</div></div>`;
        }else if(id==='custom'){
          const cols=state.layout==='2col'?2:3;
          const rows=Math.ceil(slots.length/cols);
          canvas.innerHTML=`<div class="custom-table-canvas">${Array.from({length:rows},(_,r)=>`<div class="custom-table-row cols-${cols}">${Array.from({length:cols},(__,c)=>slotHtml(slots[r*cols+c],r*cols+c)).join('')}</div>`).join('')}</div>`;
        }else if(id==='attr'){
          canvas.innerHTML=`<div class="attr-canvas"><div class="attr-avatar" data-visual-slot="0">${slots[0]?.cover?`<img src="${safe(slots[0].cover)}" referrerpolicy="no-referrer">`:'<div class="slot-empty">＋</div>'}</div><div class="attr-info"><input data-attr="name" value="${safe(slots[0]?.label||profile.name||'')}" placeholder="玩家名"><input data-attr="age" value="${safe(state.notes?.[2]||'')}" placeholder="年龄"><input data-attr="platform" value="${safe(state.notes?.[3]||'')}" placeholder="游玩平台（NS / PC / PSV…）"><input data-attr="pref" value="${safe(state.notes?.[4]||'')}" placeholder="玩法偏好（代入 / 磕代…）"></div><div class="attr-works">${Array.from({length:5},(_,i)=>slotHtml(slots[i+1],i+1)).join('')}</div><div class="attr-notes"><textarea data-note="0" placeholder="推角列表与理由">${safe(state.notes?.[0]||'')}</textarea><textarea data-note="1" placeholder="喜欢的CP与作品">${safe(state.notes?.[1]||'')}</textarea></div></div>`;
        }

        canvas.querySelectorAll('[data-visual-slot]').forEach(slot=>slot.addEventListener('click',e=>{if(e.target.matches('input'))return;window._activeAssetIndex=Number(slot.dataset.visualSlot);openEnhancedAssetPicker()}));
        canvas.querySelectorAll('.slot-label input, .attr-info input').forEach(input=>input.addEventListener('input',e=>{
          e.stopPropagation();const slot=e.target.closest('[data-visual-slot]'),st=newVisualState();
          if(slot&&st.slots[slot.dataset.visualSlot])st.slots[slot.dataset.visualSlot].label=e.target.value;
          if(e.target.dataset.attr){const idx={name:0}[e.target.dataset.attr];if(idx!==undefined&&st.slots[idx])st.slots[idx].label=e.target.value;
            if(['age','platform','pref'].includes(e.target.dataset.attr)){st.notes=st.notes||[];st.notes[{age:2,platform:3,pref:4}[e.target.dataset.attr]]=e.target.value;}}
          newSaveVisual(st);
        }));
        canvas.querySelectorAll('[data-note]').forEach(area=>area.addEventListener('input',()=>{const st=newVisualState();st.notes=st.notes||[];st.notes[area.dataset.note]=area.value;newSaveVisual(st)}));
      }

      /* ══════ Enhanced Asset Picker ══════ */
      let activeAssetTab='games';
      function openEnhancedAssetPicker(){
        activeAssetTab='games';
        renderAssetPickerList();
        $('#assetPickerOverlay').classList.add('open');
      }
      function renderAssetPickerList(){
        const list=$('#assetPickerList');
        if(activeAssetTab==='games'){
          const rows=games();
          list.innerHTML=rows.length?rows.map(g=>`<button class="asset-pick" type="button" data-asset-game="${safe(g.id)}"><div class="asset-pick-media">${g.cover?`<img src="${safe(g.cover)}" alt="${safe(g.name)}" referrerpolicy="no-referrer">`:safe(initial(g.name))}</div><span>${safe(g.name)}</span></button>`).join(''):'<div class="empty-library"><strong>游戏档案是空的</strong>先添加游戏。</div>';
        }else if(activeAssetTab==='chars'){
          const rows=visibleChars();
          list.innerHTML=rows.length?rows.map(c=>`<button class="asset-pick" type="button" data-asset-char="${safe(c.id)}"><div class="asset-pick-media">${c.image?`<img src="${safe(c.image)}" alt="${safe(c.name)}" referrerpolicy="no-referrer">`:safe(initial(c.name))}</div><span>${safe(c.name)}</span></button>`).join(''):'<div class="empty-library"><strong>角色图鉴是空的</strong>先添加角色。</div>';
        }else{
          list.innerHTML=`<div style="grid-column:1/-1;padding:24px;text-align:center"><button class="product-button" id="visualUploadBtnInPicker" type="button">选择本地图片</button><input id="visualUploadInputInPicker" type="file" accept="image/*" hidden><p class="playing-meta" style="margin-top:10px">上传图片后可在当前画布使用</p></div>`;
          const btn=$('#visualUploadBtnInPicker'),inp=$('#visualUploadInputInPicker');
          if(btn&&inp){btn.onclick=()=>inp.click();inp.onchange=event=>{
            const file=event.target.files?.[0];if(!file)return;
            const reader=new FileReader();reader.onload=()=>{
              const image=new Image();image.onload=()=>{
                const max=600,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
                canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
                canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
                const st=newVisualState(),name=file.name.replace(/\.[^.]+$/,'');
                st.slots[window._activeAssetIndex]={name,cover:canvas.toDataURL('image/jpeg',.76),label:name};
                try{newSaveVisual(st);closeAssetPicker();renderNewVisual()}catch{toast('存储空间不足')}
                event.target.value='';
              };image.src=reader.result;
            };reader.readAsDataURL(file);
          };}
        }
      }
      $('#assetPickerTabs')?.addEventListener('click',e=>{
        const tab=e.target.closest('[data-asset-tab]');if(!tab)return;
        activeAssetTab=tab.dataset.assetTab;
        $$('#assetPickerTabs .asset-picker-tab').forEach(b=>b.classList.toggle('active',b===tab));
        renderAssetPickerList();
      });
      $('#assetPickerList').addEventListener('click',e=>{
        const gamePick=e.target.closest('[data-asset-game]');
        if(gamePick){
          const game=games().find(g=>g.id===gamePick.dataset.assetGame),st=newVisualState();
          st.slots[window._activeAssetIndex]={gameId:game.id,name:game.name,cover:game.cover||'',label:game.name};
          newSaveVisual(st);closeAssetPicker();renderNewVisual();return;
        }
        const charPick=e.target.closest('[data-asset-char]');
        if(charPick){
          const char=visibleChars().find(c=>c.id===charPick.dataset.assetChar),st=newVisualState();
          st.slots[window._activeAssetIndex]={charId:char.id,name:char.name,cover:char.image||'',label:char.name};
          newSaveVisual(st);closeAssetPicker();renderNewVisual();return;
        }
      });

      /* ══════ Hook into existing visual system ══════ */
      const origOpenVisual=window.openVisualTemplate;
      window.openVisualTemplate=function(id,seedGameId='',seedCharId=''){
        if(newVisualTemplates[id]){
          window._activeVisual=id;
          $('#formTemplates').style.display='none';$('#formWorkspace').classList.add('active');$('#backToTemplates').hidden=false;
          if(seedCharId){const st=newVisualState(),char=visibleChars().find(c=>c.id===seedCharId);if(char&&!st.slots[0]){st.slots[0]={charId:char.id,name:char.name,cover:char.image||'',label:char.name};newSaveVisual(st);}}
          if(seedGameId){const st=newVisualState(),game=games().find(g=>g.id===seedGameId);if(game&&!st.slots[0]){st.slots[0]={gameId:game.id,name:game.name,cover:game.cover||'',label:game.name};newSaveVisual(st);}}
          renderNewVisual();return;
        }
        if(origOpenVisual)origOpenVisual(id,seedGameId);
      };

      /* Override save/clear/export for new templates */
      const origSave=$('#saveFormAnswers'),origClear=$('#clearFormAnswers'),origCapture=$('#captureFormAnswers');
      origSave?.addEventListener('click',()=>{if(window._activeVisual&&newVisualTemplates[window._activeVisual]){const s=newVisualState();s.title=$('#activeFormTitle').value;newSaveVisual(s);toast('图文作品已保存')}},true);
      origClear?.addEventListener('click',e=>{if(window._activeVisual&&newVisualTemplates[window._activeVisual]){e.stopImmediatePropagation();if(!confirm('清空当前画布？'))return;const all=visualStore();delete all[window._activeVisual];localStorage.setItem(VISUAL_KEY,JSON.stringify(all));renderNewVisual();toast('画布已清空')}},true);
      origCapture?.addEventListener('click',async e=>{if(window._activeVisual&&newVisualTemplates[window._activeVisual]){
        e.stopImmediatePropagation();const button=origCapture,old=button.textContent;button.disabled=true;button.textContent='正在生成…';
        try{if(!window.html2canvas)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
          const canvas=await html2canvas($('#visualSheet'),{scale:2,useCORS:true,backgroundColor:null,logging:false});const a=document.createElement('a');a.download=`${newVisualState().title||'Amorist图文作品'}.png`;a.href=canvas.toDataURL('image/png');a.click();toast('图文作品已导出');
        }catch{toast('导出受限，请使用截图')}finally{button.disabled=false;button.textContent=old}
      }},true);
      $('#activeFormTitle')?.addEventListener('input',()=>{if(window._activeVisual&&newVisualTemplates[window._activeVisual]){const st=newVisualState();st.title=$('#activeFormTitle').value;newSaveVisual(st)}},true);
      $('#backToTemplates')?.addEventListener('click',()=>{window._activeVisual=''},true);

      /* Character batch actions live here so they are bound even before any Bangumi sync. */
      $('#charBatchToggle')?.addEventListener('click',()=>{
        charBatchMode=!charBatchMode;
        if(!charBatchMode)charSelected.clear();
        $('#charBatchActions').hidden=!charBatchMode;
        $('#charBatchToggle').textContent=charBatchMode?'完成管理':'批量管理';
        renderCharacterBook($('#charSearchInput')?.value||'');
        updateCharBatchCount();
      });
      $('#charBatchAll')?.addEventListener('click',()=>{
        const visible=$$('#characterGrid .char-card').map(card=>card.dataset.charId),allSelected=visible.length&&visible.every(id=>charSelected.has(id));
        visible.forEach(id=>allSelected?charSelected.delete(id):charSelected.add(id));
        renderCharacterBook($('#charSearchInput')?.value||'');updateCharBatchCount();
      });
      $('#charBatchApplyPreference')?.addEventListener('click',()=>{
        const preference=$('#charBatchPreference').value;
        if(!preference||!charSelected.size)return toast('请先选择角色和喜好分类');
        saveChars(chars().map(c=>charSelected.has(String(c.id))?{...c,preference:dataModel.normalizeCharacterPreference(preference),updatedAt:Date.now()}:c));
        $('#charBatchPreference').value='';charSelected.clear();renderCharacterBook($('#charSearchInput')?.value||'');updateCharBatchCount();toast('已批量更新角色喜好');
      });
      $('#charBatchApplyRole')?.addEventListener('click',()=>{
        const roleType=$('#charBatchRoleType').value;
        if(!roleType||!charSelected.size)return toast('请先选择角色和身份');
        saveChars(chars().map(c=>charSelected.has(String(c.id))?{...c,roleType:dataModel.normalizeCharacterRoleType(roleType),roleTypeSource:'manual',updatedAt:Date.now()}:c));
        $('#charBatchRoleType').value='';charSelected.clear();renderCharacterBook($('#charSearchInput')?.value||'');updateCharBatchCount();toast('已批量更新角色身份');
      });
      $('#charBatchDelete')?.addEventListener('click',()=>{
        if(!charSelected.size)return toast('请先选择角色');
        const rows=chars(),count=rows.filter(c=>charSelected.has(String(c.id))).length;
        if(!count||!confirm(`删除选中的 ${count} 位角色？`))return;
        saveChars(rows.filter(c=>!charSelected.has(String(c.id))));charSelected.clear();renderCharacterBook($('#charSearchInput')?.value||'');updateCharBatchCount();toast(`已删除 ${count} 位角色`);
      });
      $('#charBatchCancel')?.addEventListener('click',()=>{
        charBatchMode=false;charSelected.clear();$('#charBatchActions').hidden=true;$('#charBatchToggle').textContent='批量管理';
        renderCharacterBook($('#charSearchInput')?.value||'');updateCharBatchCount();
      });
      window.addEventListener('amorist-data-changed',event=>{
        if(!event.detail||event.detail.chars||event.detail.games)renderCharacterBook($('#charSearchInput')?.value||'');
        if((!event.detail||event.detail.games)&&typeof populateGameSelect==='function')populateGameSelect();
        if(typeof updateProfileArchiveStats==='function')updateProfileArchiveStats();
      });
      window.addEventListener('amorist-bangumi-cache-ready',event=>{
        bangumiRoleRows=Array.isArray(event.detail?.list)?event.detail.list:[];
        renderCharacterBook($('#charSearchInput')?.value||'');
      });

      const characterPage=document.querySelector('.product-view[data-product-view="characters"]');
      if(characterPage){
        let birthdayBackfillStarted=false;
        const startCharacterPage=()=>{
          if(!characterPage.classList.contains('active'))return;
          renderCharacterBook($('#charSearchInput')?.value||'');
          if(!birthdayBackfillStarted){birthdayBackfillStarted=true;void backfillCharacterBirthdays();}
        };
        const characterPageObserver=new MutationObserver(startCharacterPage);
        characterPageObserver.observe(characterPage,{attributes:true,attributeFilter:['class']});
        startCharacterPage();
      }

      /* ══════ Init ══════ */
    })();
;

/* ===== inline-script ===== */
/* ══════════════════════════════════════════════════════════
     Bangumi DB — 独立检索库（本地缓存版）
     数据一次性礼貌同步到 IndexedDB，之后浏览/筛选全部走本地，零请求
     ══════════════════════════════════════════════════════════ */
  ;(function(){
    'use strict';
    /* ── 与游戏档案 / 角色图鉴共用的读写 ── */
    const BG_KEY='amorist-game-library-v1', BC_KEY='amorist-character-book-v1';
    const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
    const dataModel=window.AmoristDataModel;
    const games=()=>{try{const rows=JSON.parse(localStorage.getItem(BG_KEY)||'[]');return Array.isArray(rows)?rows.map(dataModel.normalizeGameRecord):[]}catch(e){return[]}};
    const saveGames=v=>localStorage.setItem(BG_KEY,JSON.stringify((Array.isArray(v)?v:[]).map(dataModel.normalizeGameRecord)));
    const chars=()=>{try{const rows=JSON.parse(localStorage.getItem(BC_KEY)||'[]');const gameRows=games();return Array.isArray(rows)?rows.map(character=>dataModel.normalizeCharacterRecord(character,gameRows)):[]}catch(e){return[]}};
    const saveChars=v=>localStorage.setItem(BC_KEY,JSON.stringify((Array.isArray(v)?v:[]).map(character=>dataModel.normalizeCharacterRecord(character,games()))));
    const toast=m=>{const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2400)};
    const safe=v=>String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const imgFix=u=>u?String(u).replace(/^http:\/\//i,'https://').replace(/^\/\//,'https://'):'';

    /* ── IndexedDB 本地资料库 ── */
    const DB_NAME='amorist-bangumi-db';
    const DELETED_BANGUMI_KEY='amorist-bangumi-deleted-v1';
    function deletedBangumiIds(){try{const value=JSON.parse(localStorage.getItem(DELETED_BANGUMI_KEY)||'[]');return Array.isArray(value)?value.map(String):[]}catch{return[];}}
    function clearDeletedBangumiId(id){const next=deletedBangumiIds().filter(value=>value!==String(id));if(next.length)localStorage.setItem(DELETED_BANGUMI_KEY,JSON.stringify(next));else localStorage.removeItem(DELETED_BANGUMI_KEY);}
    let _db=null;
    function openDB(){
      if(_db)return Promise.resolve(_db);
      return new Promise((res,rej)=>{
        const rq=indexedDB.open(DB_NAME,1);
        rq.onupgradeneeded=e=>{
          const db=e.target.result;
          if(!db.objectStoreNames.contains('games'))db.createObjectStore('games',{keyPath:'id'});
        };
        rq.onsuccess=e=>{_db=e.target.result;res(_db);};
        rq.onerror=()=>rej(rq.error);
      });
    }
    function dbAll(){return openDB().then(db=>new Promise((res,rej)=>{const rq=db.transaction('games').objectStore('games').getAll();rq.onsuccess=()=>res(rq.result||[]);rq.onerror=()=>rej(rq.error);}));}
    function dbGet(id){return openDB().then(db=>new Promise((res,rej)=>{const rq=db.transaction('games').objectStore('games').get(id);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);}));}
    function dbPut(v){return openDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction('games','readwrite');tx.objectStore('games').put(v);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}));}
    function dbDelete(id){return openDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction('games','readwrite');tx.objectStore('games').delete(Number(id));tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}));}
    function dbBulk(list){return openDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction('games','readwrite');const os=tx.objectStore('games');list.forEach(v=>os.put(v));tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}));}

    /* ── 网络：HTML 列表页走公共中继，v0 API 直连 ── */
    const RELAYS=[
      /* Bangumi may allow direct browser access; prefer it before third-party relays. */
      u=>u,
      u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
      u=>'https://corsproxy.io/?url='+encodeURIComponent(u),
      u=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u)
    ];
    /* 每次请求的控制信号：自带超时，同时响应外部取消（暂停）信号 */
    function combinedSignal(outer,timeoutMs){
      const ctl=new AbortController();
      const timer=setTimeout(()=>ctl.abort(),timeoutMs);
      const onOuter=()=>ctl.abort();
      if(outer){
        if(outer.aborted)ctl.abort();
        else outer.addEventListener('abort',onOuter,{once:true});
      }
      const cleanup=()=>{clearTimeout(timer);if(outer)outer.removeEventListener('abort',onOuter);};
      return {signal:ctl.signal,cleanup};
    }
    async function fetchBrowserHTML(url,outer){
      for(const wrap of RELAYS){
        for(let i=0;i<2;i++){
          if(outer&&outer.aborted)throw new Error('aborted');
          const cs=combinedSignal(outer,12000);
          try{
            const r=await fetch(wrap(url),{signal:cs.signal});
            cs.cleanup();
            if(!r.ok)continue;
            const t=await r.text();
            if(t&&(t.indexOf('item_')>-1||t.indexOf('browserItemList')>-1))return t;
          }catch(e){
            cs.cleanup();
            if(outer&&outer.aborted)throw new Error('aborted');
          }
          await sleep(700);
        }
      }
      throw new Error('中继暂时不可用');
    }
    async function v0(path,outer){
      for(let attempt=0;attempt<3;attempt++){
        if(outer&&outer.aborted)throw new Error('aborted');
        const cs=combinedSignal(outer,15000);
        try{
          const r=await fetch('https://api.bgm.tv'+path,{signal:cs.signal});
          cs.cleanup();
          if(r.status===429){await sleep(10000*(attempt+1));continue;}
          if(!r.ok)throw new Error('HTTP '+r.status);
          return r.json();
        }catch(e){
          cs.cleanup();
          if(outer&&outer.aborted)throw new Error('aborted');
          if(e&&e.name==='AbortError'){await sleep(5000);continue;}
          throw e;
        }
      }
      throw new Error('请求失败或过于频繁，请稍后再试');
    }
    window.searchBangumiCharacters=async function(keyword){
      const q=String(keyword||'').trim();if(!q)return[];
      const r=await fetch('https://api.bgm.tv/v0/search/characters?limit=20&offset=0',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({keyword:q,sort:'match'})});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const json=await r.json();return Array.isArray(json.data)?json.data:[];
    };
    const BROWSER_BASE='https://bgm.tv/game/tag/'+encodeURIComponent('乙女ゲーム')+'?page=';

    /* Prefer the official search API for discovery.  The HTML tag pages are
       useful as a fallback, but a failed page-2 relay must not truncate the
       library to the first 24 results. */
    async function searchOtomeSubjects(outer){
      /* Bangumi currently caps this endpoint at 20 rows per response. */
      const limit=20, result=[];
      for(let offset=0;offset<2000;offset+=limit){
        if(outer&&outer.aborted)throw new Error('aborted');
        const cs=combinedSignal(outer,15000);
        try{
          const r=await fetch('https://api.bgm.tv/v0/search/subjects?limit='+limit+'&offset='+offset,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({filter:{type:[4],tag:['乙女ゲーム']},sort:'match'}),signal:cs.signal});
          cs.cleanup();
          if(r.status===429){await sleep(5000);offset-=limit;continue;}
          if(!r.ok)throw new Error('HTTP '+r.status);
          const json=await r.json(), rows=Array.isArray(json.data)?json.data:[];
          if(!rows.length)break;
          result.push(...rows.map(s=>({id:s.id,name:s.name||'',nameAlt:s.name_cn||'',date:s.date||'',year:s.date?+String(s.date).slice(0,4):null,cover:imgFix(s.images&&(s.images.large||s.images.common||s.images.medium||s.images.small)||'')})).filter(x=>x.id));
          setProgress('正在通过官方 API 获取游戏列表…',result.length,json.total||0);
          if(rows.length<limit||(json.total&&result.length>=json.total))break;
          await sleep(250);
        }catch(e){
          cs.cleanup();
          if(outer&&outer.aborted)throw new Error('aborted');
          throw e;
        }
      }
      return result;
    }

    function parseBrowserPage(html){
      const doc=new DOMParser().parseFromString(html,'text/html');
      return [...doc.querySelectorAll('#browserItemList .item')].map(li=>{
        const m=(li.id||'').match(/item_(\d+)/);
        const id=m?+m[1]:0;
        const a=li.querySelector('h3 a.l')||li.querySelector('h3 a');
        const small=li.querySelector('h3 small');
        const img=li.querySelector('img');
        const cover=img?(img.getAttribute('src')||img.getAttribute('data-cfsrc')||''):'';
        return {id,name:a?a.textContent.trim():'',nameAlt:small?small.textContent.trim():'',cover:imgFix(cover)};
      }).filter(x=>x.id);
    }
    function infoboxPick(infobox,keys){
      for(const it of (infobox||[])){
        if(keys.indexOf(it.key)>-1){
          let val=it.value;
          if(!Array.isArray(val))val=(val==null?[]:[val]);
          const arr=val.map(v=>{
            if(v==null)return '';
            if(typeof v==='string')return v;
            return (v.v||v.k)||'';
          }).filter(Boolean);
          if(arr.length)return arr;
        }
      }
      return [];
    }
    const DEV_KEYS=['开发','制作','开发商','製作','制作公司','开发公司'];
    const WRITER_KEYS=['剧本','编剧','脚本','系列构成','企画','原作'];
    function normChars(cl){
      const arr=Array.isArray(cl)?cl:((cl&&cl.data)||[]);
      return arr.map(c=>({
        id:c.id||c.character_id||'',
        name:c.name||'',
        nameCn:c.name_cn||c.nameCn||'',
        aliases:Array.isArray(c.aliases)?c.aliases:[],
        relation:c.relation||c.role_name||'',
        cv:(c.actors&&c.actors[0]&&c.actors[0].name)||'',
        image:imgFix(c.images?(c.images.large||c.images.medium||c.images.grid||''):''),
        summary:c.summary||'',infobox:c.infobox||[],nameSearchSynced:Boolean(c.nameSearchSynced)
      })).filter(c=>c.name);
    }
    function characterInfoboxValues(rows,keyPattern){
      const values=[];
      (Array.isArray(rows)?rows:[]).forEach(row=>{
        if(!keyPattern.test(String(row?.key||'')))return;
        const raw=row?.value,items=Array.isArray(raw)?raw:[raw];
        items.forEach(item=>{
          const value=typeof item==='string'?item:(item?.v||item?.name||'');
          if(value&&!values.includes(String(value).trim()))values.push(String(value).trim());
        });
      });
      return values;
    }
    function characterSearchNames(detail){
      const chinese=characterInfoboxValues(detail?.infobox,/简体中文名|繁体中文名|中文名/);
      const aliases=characterInfoboxValues(detail?.infobox,/别名|別名/);
      return {nameCn:detail?.name_cn||chinese[0]||'',aliases:[...new Set([...chinese.slice(1),...aliases])].filter(Boolean)};
    }
    async function enrichCharacterSearchNames(list,{delay=180}={}){
      const output=[];
      for(let index=0;index<(list||[]).length;index++){
        const character={...list[index]};
        if(character.id&&!character.nameSearchSynced){
          try{
            const detail=await v0('/v0/characters/'+encodeURIComponent(character.id));
            const names=characterSearchNames(detail);
            character.name=detail.name||character.name;character.nameCn=names.nameCn||character.nameCn||'';
            character.aliases=[...new Set([...(character.aliases||[]),...names.aliases])];
            character.summary=detail.summary||character.summary||'';character.infobox=detail.infobox||character.infobox||[];
            character.gender=detail.gender||character.gender||'';character.nameSearchSynced=true;character.birthdayCheckedAt=Date.now();
          }catch(e){character.nameSearchSynced=false;}
          if(delay&&index<(list.length-1))await sleep(delay);
        }
        output.push(character);
      }
      return output;
    }
    function characterRoleGroup(c){
      const rel=String(c.relation||'').toLowerCase();
      if(/女主角|女主|主人公|ヒロイン|heroine/.test(rel))return 'heroine';
      if(/攻略对象|攻略対象|攻略角色|可攻略|男主角|target/.test(rel))return 'target';
      if(/配角|脇役|support|side/.test(rel))return 'support';
      if(/主角|主役|main|protagonist|メイン/.test(rel))return 'main';
      return 'other';
    }

    /* ── 中继全挂时的精选种子（直连 API 即可补全）── */
    const SEED_IDS=[2749,49285,496249,144083,560662,259951,253856,283695,499033,117949,87391,320129,45852,283693,29057,46297,192495,109570,214521,260498,50756,20936,55774,113920];

    /* ── 同步引擎（限速 / 可暂停 / 断点续传）── */
    const sync={running:false,cancel:false};
    let syncCtl=null;
    function setProgress(txt,done,total){
      const box=$('#bangumiDbProgress'),bar=$('#bangumiDbProgressBar'),t=$('#bangumiDbProgressText');
      const manageStatus=$('#bangumiDbManageStatus');
      if(!box)return;
      if(!txt){box.hidden=true;if(manageStatus)manageStatus.textContent='准备就绪';return;}
      box.hidden=false;
      if(t)t.textContent=txt+(total?('  '+done+' / '+total):'');
      if(bar)bar.style.width=(total?Math.round(done/total*100):0)+'%';
      if(manageStatus)manageStatus.textContent=txt+(total?('  '+done+' / '+total):'');
    }
    function setStats(){
      const el=$('#bangumiDbTotal');if(!el)return;
      dbAll().then(list=>{
        const total=list.length,ok=list.filter(g=>g.synced).length;
        el.textContent=total||0;
      }).catch(()=>{el.textContent='—';});
    }
    function syncCharacterBookLinks(game){
      const linkedGame=games().find(x=>String(x.bangumiId||'')===String(game.id));if(!linkedGame||!Array.isArray(game.chars)||!game.chars.length)return;
      const all=chars();let changed=false;
      all.filter(c=>String(c.gameId||'')===String(linkedGame.id)).forEach(c=>{
        const match=game.chars.find(x=>(x.id&&String(x.id)===String(c.bangumiCharacterId||''))||x.name===c.name);if(!match)return;
        if(match.id&&!c.bangumiCharacterId){c.bangumiCharacterId=match.id;changed=true;}
        if(!c.bangumiSubjectId){c.bangumiSubjectId=game.id;changed=true;}
        if(!c.cv&&match.cv){c.cv=match.cv;changed=true;}
        if(!c.image&&match.image){c.image=match.image;changed=true;}
        if(c.roleTypeSource!=='manual'){
          const roleType=dataModel.roleTypeFromBangumiRelation(match.relation);
          if(c.roleType!==roleType||c.roleTypeSource!=='bangumi'){c.roleType=roleType;c.roleTypeSource='bangumi';changed=true;}
        }
      });
      if(changed)saveChars(all);
    }

    async function syncLibrary(){
      if(sync.running){toast('同步正在进行中…');return;}
      sync.running=true;sync.cancel=false;
      syncCtl=new AbortController();
      const signal=syncCtl.signal;
      const syncBtn=$('#bangumiDbSync'),cancelBtn=$('#bangumiDbCancel');
      if(syncBtn)syncBtn.hidden=true;if(cancelBtn)cancelBtn.hidden=false;
      let usedSeed=false;
      try{
        /* 阶段一：列出全部打了「乙女游戏」标签的作品 ID（可暂停）*/
        setProgress('正在获取乙女游戏列表…',0,0);
        let found=[];
        try{
          found=await searchOtomeSubjects(signal);
        }catch(e){found=[];}
        if(!found.length){
          try{
            for(let page=1;page<=80;page++){
              if(signal.aborted)break;
              const items=parseBrowserPage(await fetchBrowserHTML(BROWSER_BASE+page,signal));
              if(!items.length)break;
              found=found.concat(items);
              setProgress('正在通过网页列表获取游戏… 第 '+page+' 页 · 已发现 '+found.length+' 部',0,0);
              await sleep(700);
            }
          }catch(e){if(signal.aborted)throw e;}
        }
        if(signal.aborted)throw new Error('aborted');
        let targets;
        if(found.length){targets=found;}
        else{usedSeed=true;targets=SEED_IDS.map(id=>({id,name:'',nameAlt:'',cover:''}));toast('中继暂不可用，先同步精选作品');}

        /* 合并进本地库（保留已同步的详情）*/
        const existing=await dbAll();
        const exMap=new Map(existing.map(g=>[g.id,g]));
        const merged=targets.map(it=>{
          const ex=exMap.get(it.id);
          if(ex)return Object.assign({},ex,{name:it.name||ex.name,cover:ex.cover||it.cover,nameCn:ex.nameCn||((it.nameAlt&&it.nameAlt!==it.name)?it.nameAlt:''),date:it.date||ex.date||'',year:it.year||ex.year||null});
          return {id:it.id,name:it.name,nameCn:((it.nameAlt&&it.nameAlt!==it.name)?it.nameAlt:''),date:it.date||'',year:it.year||null,cover:it.cover,synced:false,chars:[],updatedAt:Date.now()};
        });
        await dbBulk(merged);
        /* 先把已发现的游戏刷上网格（封面+名称），详情随后逐部补齐 */
        CACHE=await dbAll();buildDatalists(CACHE);
        renderGridContents();
        setStats();

        /* 阶段二：逐部抓取详情+角色（直连 API，限速，跳过已完成，抓完一部即显示一部）*/
        await runDetailPhase(signal);
        setProgress('',0,0);
        toast(signal.aborted?'已暂停，随时可继续':(usedSeed?'精选作品同步完成':'同步完成'));
      }catch(e){
        setProgress('',0,0);
        if(e&&e.message==='aborted')toast('已暂停，随时可继续');
        else toast('同步出错：'+e.message);
      }finally{
        sync.running=false;syncCtl=null;
        if(syncBtn)syncBtn.hidden=false;if(cancelBtn)cancelBtn.hidden=true;
        setStats();
      }
    }

    /* ── 详情阶段：逐部抓详情+角色，跳过已同步，抓完一部即显示一部 ── */
    async function runDetailPhase(signal){
      const pending=CACHE.filter(g=>!g.synced||((g.chars||[]).some(c=>c.name&&!c.id)));
      let done=0;
      for(const g of pending){
        if(signal.aborted)break;
        try{
          const s=await v0('/v0/subjects/'+g.id,signal);
          if(signal.aborted)break;
          await sleep(2000);
          let cl=[];try{cl=await v0('/v0/subjects/'+g.id+'/characters',signal);}catch(e){cl=[];}
          if(signal.aborted)break;
          const rec=Object.assign({},g,{
            name:s.name||g.name,
            nameCn:s.name_cn||g.nameCn||'',
            cover:imgFix((s.images&&(s.images.large||s.images.common||s.images.medium))||g.cover),
            developer:infoboxPick(s.infobox,DEV_KEYS)[0]||'',
            writers:infoboxPick(s.infobox,WRITER_KEYS),
            date:s.date||'',
            year:s.date?+String(s.date).slice(0,4):null,
            desc:s.summary||'',
            rank:s.rank||null,
            platforms:s.platform?[s.platform]:[],
            chars:normChars(cl),
            synced:true,
            updatedAt:Date.now()
          });
          await dbPut(rec);
          syncCharacterBookLinks(rec);
          liveGrid(rec); /* 增量上屏 */
        }catch(e){ if(signal.aborted)break; /* 单部失败跳过，下次可续 */ }
        done++;
        setProgress('正在同步封面 / 角色 / 制作信息',done,pending.length);
        await sleep(2500);
      }
    }

    /* ── 只补齐剩余详情（不重新拉列表）── */
    async function syncDetailsOnly(){
      if(sync.running){toast('同步正在进行中…');return;}
      sync.running=true;sync.cancel=false;
      syncCtl=new AbortController();
      const signal=syncCtl.signal;
      const syncBtn=$('#bangumiDbSync'),detailBtn=$('#bangumiDbDetailSync'),cancelBtn=$('#bangumiDbCancel');
      if(syncBtn)syncBtn.hidden=true;if(detailBtn)detailBtn.hidden=true;if(cancelBtn)cancelBtn.hidden=false;
      try{
        CACHE=await dbAll();buildDatalists(CACHE);
        const pendingCount=CACHE.filter(g=>!g.synced).length;
        if(!CACHE.length){toast('请先同步乙女游戏档案');}
        else if(!pendingCount){toast('所有游戏的详情都已补齐');}
        else{
          await runDetailPhase(signal);
          setProgress('',0,0);
          toast(signal.aborted?'已暂停，随时可继续':'详情已补齐');
        }
      }catch(e){
        setProgress('',0,0);
        if(e&&e.message==='aborted')toast('已暂停，随时可继续');
        else toast('补齐详情出错：'+e.message);
      }finally{
        sync.running=false;syncCtl=null;
        if(syncBtn)syncBtn.hidden=false;if(detailBtn)detailBtn.hidden=false;if(cancelBtn)cancelBtn.hidden=true;
        setStats();
      }
    }

    /* ── 本地筛选（名称 + 厂商 + 声优 + 剧本，AND 组合）── */
    let CACHE=[];
    let bgEraFilter='';
    let bgBatchMode=false;
    const bgBatchSelected=new Set();
    function currentFilters(){
      return {
        q:($('#bangumiDbSearch')?$('#bangumiDbSearch').value:'').trim().toLowerCase(),
        maker:($('#bangumiDbMaker')?$('#bangumiDbMaker').value:'').trim().toLowerCase(),
        cv:($('#bangumiDbCv')?$('#bangumiDbCv').value:'').trim().toLowerCase(),
        writer:($('#bangumiDbWriter')?$('#bangumiDbWriter').value:'').trim().toLowerCase(),
        era:bgEraFilter
      };
    }
    function infoText(value){
      if(value==null)return '';
      if(Array.isArray(value))return value.map(infoText).filter(Boolean).join(' / ');
      if(typeof value==='object')return infoText(value.name||value.n||value.value||value.v||'');
      return String(value).trim();
    }
    const optionDecoder=document.createElement('textarea');
    function cleanOptionText(value){
      let text=infoText(value);if(!text)return '';
      optionDecoder.innerHTML=text;
      return optionDecoder.value.normalize('NFKC')
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/g,'')
        .replace(/\s+/g,' ').trim();
    }
    function isUsableOption(value){
      const text=cleanOptionText(value);
      if(!text||text.length>90)return false;
      if(/^(?:null|undefined|unknown|none|n\/?a|暂无|不明|未填写|\[object object\])$/i.test(text))return false;
      if(/\uFFFD|https?:\/\/|www\.|(?:ï¿|â€|ãƒ|ã‚|ã|æ—|å­|ä¸)/i.test(text))return false;
      return /[\p{L}\p{N}]/u.test(text);
    }
    function canonicalEntityLabel(value){
      const original=cleanOptionText(value).replace(/^(剧本|脚本|编剧|系列构成|scenario|writer|cv|声优)\s*[:：]\s*/i,'').trim();
      if(!original)return '';
      let base=original;
      for(let i=0;i<3;i++){
        const next=base.replace(/\s*[（(［\[][^（）()［］\[\]]{1,60}[）)］\]]\s*$/u,'').trim();
        if(next===base||next.length<2)break;base=next;
      }
      return base||original;
    }
    function normalizeLookup(value){return cleanOptionText(value).toLowerCase().replace(/[\s　·・･._'’"“”`~—–-]+/g,'');}
    function canonicalEntityKey(value){return normalizeLookup(canonicalEntityLabel(value));}
    function personParts(value){return cleanOptionText(value).split(/[\/／,，、;；|｜\n]+/).map(cleanOptionText).filter(isUsableOption);}
    function entityMatches(value,query){
      const queryFull=normalizeLookup(query),queryKey=canonicalEntityKey(query);if(!queryFull)return true;
      return personParts(value).some(name=>{const full=normalizeLookup(name),key=canonicalEntityKey(name);return full.includes(queryFull)||queryFull.includes(full)||(queryKey&&key&&(key===queryKey||key.includes(queryKey)||queryKey.includes(key)));});
    }
    function buildOptionEntries(list,extractor,{entity=true}={}){
      const map=new Map();
      list.forEach(game=>{
        const perGame=new Map();
        const values=extractor(game),parts=(Array.isArray(values)?values:[values]).flatMap(personParts);
        parts.forEach(raw=>{
          const cleaned=cleanOptionText(raw),label=entity?canonicalEntityLabel(cleaned):cleaned;
          if(!isUsableOption(label))return;
          const key=entity?canonicalEntityKey(label):normalizeLookup(label);if(!key)return;
          let item=perGame.get(key);if(!item){item={label,aliases:new Set()};perGame.set(key,item);}
          item.aliases.add(cleaned);item.aliases.add(label);if(label.length<item.label.length)item.label=label;
        });
        perGame.forEach((item,key)=>{
          let target=map.get(key);if(!target){target={label:item.label,count:0,aliases:new Set()};map.set(key,target);}
          target.count+=1;item.aliases.forEach(alias=>target.aliases.add(alias));if(item.label.length<target.label.length)target.label=item.label;
        });
      });
      return [...map.values()].map(item=>({label:item.label,count:item.count,aliases:[...item.aliases]})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'zh-CN'));
    }
    function gameSearchText(g){
      return [g.name,g.nameCn,g.nameAlt,g.name_alt,g.alias,g.aliases,g.title,g.titleCn]
        .flatMap(value=>Array.isArray(value)?value:[value]).map(infoText).filter(Boolean).join(' ').toLowerCase();
    }
    function isVersionRelation(row){
      const relation=String(row?.relation||'').toLowerCase();
      return Number(row?.type)===4&&(/不同版本|主版本|version|original|remake|移植|重制|重製/.test(relation));
    }
    function versionTitle(row){return String(row?.name_cn||row?.name||'').trim();}
    async function loadVersionSubject(row){
      const id=Number(row?.id||row);if(!id)return null;
      let cached=await dbGet(id);
      if(cached?.synced&&Array.isArray(cached.chars)&&(cached.chars.length||cached.characterFetchCheckedAt))return cached;
      const subject=await v0('/v0/subjects/'+id);
      let characterRows=[];try{characterRows=await v0('/v0/subjects/'+id+'/characters');}catch{}
      const record=Object.assign({},cached||row,{
        id,
        name:subject.name||cached?.name||row?.name||'',
        nameCn:subject.name_cn||cached?.nameCn||row?.name_cn||'',
        cover:imgFix((subject.images&&(subject.images.large||subject.images.common||subject.images.medium))||cached?.cover||row?.images?.large||''),
        date:subject.date||cached?.date||'',
        year:subject.date?+String(subject.date).slice(0,4):(cached?.year||null),
        platforms:subject.platform?[subject.platform]:(cached?.platforms||[]),
        chars:normChars(characterRows),characterFetchCheckedAt:Date.now(),
        synced:true,
        updatedAt:Date.now()
      });
      await dbPut(record);
      const cachedIndex=CACHE.findIndex(item=>String(item.id)===String(id));
      if(cachedIndex>=0)CACHE[cachedIndex]=record;else CACHE.push(record);
      return record;
    }
    async function resolveVersionedDetail(game){
      if(!game)return game;
      const stored=await dbGet(Number(game.id));
      if(stored)game=Object.assign({},stored,game);
      // 旧缓存可能已经记录过一次解析时间，但当时当前条目没有角色、关联版本也未成功回填。
      // 这种缓存不能直接短路，否则重新导入时永远不会再尝试获取版本条目的角色。
      if(game.versionResolveCompleted)return game;
      const related=await v0('/v0/subjects/'+game.id+'/subjects');
      const versionRows=Array.isArray(related)?related.filter(isVersionRelation):[];
      if(!versionRows.length){game.versionResolveCheckedAt=Date.now();game.versionResolveCompleted=true;await dbPut(game);return game;}
      const versionRecords=[game];
      for(const row of versionRows.slice(0,8)){
        try{const record=await loadVersionSubject(row);if(record)versionRecords.push(record);}catch{}
      }
      const ownCharacters=Array.isArray(game.chars)?game.chars:[];
      const characterSource=versionRecords.filter(row=>String(row.id)!==String(game.id)&&Array.isArray(row.chars)&&row.chars.length).sort((a,b)=>b.chars.length-a.chars.length)[0]||null;
      game.versionIds=versionRecords.map(row=>Number(row.id)).filter(Boolean);
      game.versionResolveCheckedAt=Date.now();
      game.versionResolveCompleted=true;
      if(!ownCharacters.length&&characterSource){
        game.characterSourceId=Number(characterSource.id);
        game.characterSourceName=versionTitle(characterSource);
        game.chars=characterSource.chars;
        game.inheritedCharacters=true;
      }
      await dbPut(game);
      const index=CACHE.findIndex(item=>String(item.id)===String(game.id));
      if(index>=0)CACHE[index]=game;
      return game;
    }
    function applyFilters(list){
      const f=currentFilters();
      return list.filter(g=>{
        if(f.q&&!gameSearchText(g).includes(f.q))return false;
        if(f.maker&&!entityMatches(g.developer,f.maker))return false;
        if(f.cv&&!(g.chars||[]).some(c=>entityMatches(c.cv,f.cv)))return false;
        if(f.writer&&!entityMatches(g.writers,f.writer))return false;
        if(f.era){
          const year=bangumiYear(g)||0;
          if(f.era==='2020s'&&!(year>=2020&&year<=2029))return false;
          if(f.era==='2010s'&&!(year>=2010&&year<=2019))return false;
          if(f.era==='2000s'&&!(year>=2000&&year<=2009))return false;
          if(f.era==='1990s'&&!(year>=1990&&year<=1999))return false;
          if(f.era==='classic'&&!(year>0&&year<1990))return false;
        }
        return true;
      });
    }

    /* ── 渲染 ── */
    function bangumiViewActive(){return document.querySelector('.product-view[data-product-view="bangumi"]')?.classList.contains('active');}
    function refresh(){
      return dbAll().then(list=>{CACHE=list;buildDatalists(list);if(bangumiViewActive())renderGrid();setStats();window.dispatchEvent(new CustomEvent('amorist-bangumi-cache-ready',{detail:{list:CACHE.slice()}}));}).catch(()=>{CACHE=[];if(bangumiViewActive())renderGrid();setStats();window.dispatchEvent(new CustomEvent('amorist-bangumi-cache-ready',{detail:{list:[]}}));});
    }
    let GAME_OPTS=[],MAKER_OPTS=[],CV_OPTS=[],WRITER_OPTS=[];
    function buildDatalists(list){
      GAME_OPTS=buildOptionEntries(list,g=>[g.name,g.nameCn,g.nameAlt,g.name_alt,g.alias,g.aliases,g.title,g.titleCn],{entity:false});
      MAKER_OPTS=buildOptionEntries(list,g=>g.developer,{entity:true});
      CV_OPTS=buildOptionEntries(list,g=>(g.chars||[]).map(c=>c.cv),{entity:true});
      WRITER_OPTS=buildOptionEntries(list,g=>g.writers,{entity:true});
    }
    /* ── 搜索+选项 combobox ── */
    function initCombos(){
      wireCombo('#comboGame','#bangumiDbSearch',()=>GAME_OPTS);
      wireCombo('#comboMaker','#bangumiDbMaker',()=>MAKER_OPTS);
      wireCombo('#comboCv','#bangumiDbCv',()=>CV_OPTS);
      wireCombo('#comboWriter','#bangumiDbWriter',()=>WRITER_OPTS);
      document.addEventListener('click',e=>{
        document.querySelectorAll('.bgm-combo').forEach(w=>{
          if(!w.contains(e.target)){const l=w.querySelector('.bgm-combo-list');if(l)l.hidden=true;}
        });
      });
    }
    function wireCombo(wrapSel,inputSel,getOpts){
      const wrap=$(wrapSel),input=$(inputSel);if(!wrap||!input)return;
      const listEl=wrap.querySelector('.bgm-combo-list');if(!listEl)return;
      function paint(){
        const q=normalizeLookup(input.value),all=getOpts();
        const matches=(q?all.filter(option=>normalizeLookup([option.label,...(option.aliases||[])].join(' ')).includes(q)):all).slice(0,80);
        if(!matches.length){listEl.innerHTML='<div class="bgm-combo-empty">无匹配项</div>';}
        else{listEl.innerHTML=matches.map(option=>'<div class="bgm-combo-item" data-v="'+safe(option.label)+'"><span>'+safe(option.label)+'</span><small>'+option.count+' 部</small></div>').join('');}
        listEl.hidden=false;
      }
      wrap.addEventListener('click',event=>{if(event.target===wrap){input.focus();paint();}});
      input.addEventListener('focus',paint);
      input.addEventListener('input',()=>{paint();renderGrid();});
      listEl.addEventListener('mousedown',e=>{
        const it=e.target.closest('.bgm-combo-item');if(!it)return;
        e.preventDefault();
        input.value=it.dataset.v;listEl.hidden=true;renderGrid();
      });
      input.addEventListener('keydown',e=>{if(e.key==='Escape')listEl.hidden=true;});
    }
    function isImported(g,myGames){
      return myGames.some(eg=>String(eg.bangumiId||'')===String(g.id)||eg.name===(g.nameCn||g.name)||eg.name===g.name);
    }
    let resourceScreen='search';
    function switchResourceScreen(screen,{scroll=true}={}){
      if(!['search','detail'].includes(screen))screen='search';
      resourceScreen=screen;
      document.querySelectorAll('[data-resource-screen]').forEach(panel=>{const active=panel.dataset.resourceScreen===screen;panel.hidden=!active;panel.classList.toggle('active',active);});
      if(scroll){const page=document.querySelector('.product-view[data-product-view="bangumi"]');const top=page?Math.max(0,page.getBoundingClientRect().top+window.scrollY-24):0;window.scrollTo({top,behavior:'smooth'});}
    }
    const BANGUMI_PAGE_SIZE=48;
    let bgRenderLimit=BANGUMI_PAGE_SIZE;
    function renderGrid(){bgRenderLimit=BANGUMI_PAGE_SIZE;renderGridContents();}
    function renderGridContents(){
      const grid=$('#bangumiDbGrid');if(!grid)return;
      if(!CACHE.length){
        grid.innerHTML='<div class="bangumi-db-welcome"><h2>作品资料库还是空的</h2><button class="product-button secondary" id="bangumiWelcomeManage" type="button">打开更新管理</button></div>';
        const c=$('#bangumiDbCount');if(c)c.textContent='';
        const wb=$('#bangumiWelcomeManage');if(wb)wb.addEventListener('click',openBangumiManager);
        return;
      }
      const myGames=games();
      const list=applyFilters(CACHE).sort((a,b)=>{
        const ay=bangumiYear(a),by=bangumiYear(b);
        if(ay===null&&by!==null)return 1;
        if(ay!==null&&by===null)return -1;
        if(ay!==null&&by!==null&&ay!==by)return bgSortOrder==='asc'?ay-by:by-ay;
        return (a.rank||999999)-(b.rank||999999);
      });
      const c=$('#bangumiDbCount');if(c)c.textContent=list.length+' 部作品';
      if(!list.length){grid.innerHTML='<div class="bangumi-db-empty">没有符合条件的游戏，换个关键词试试？</div>';return;}
      const visibleList=list.slice(0,bgRenderLimit);
      const groups=[];
      visibleList.forEach(g=>{
        const key=bangumiYear(g)||'年份未记录';
        let group=groups.find(item=>item.key===key);
        if(!group){group={key,items:[]};groups.push(group);}
        group.items.push(g);
      });
      grid.classList.add('bangumi-timeline');
      const remaining=Math.max(0,list.length-visibleList.length);
      grid.innerHTML=groups.map(group=>'<section class="bangumi-timeline-year"><div class="bangumi-timeline-year-label">'+safe(group.key)+'</div><div class="bangumi-timeline-items">'+group.items.map(g=>bangumiCardMarkup(g,myGames)).join('')+'</div></section>').join('')
        +(remaining?'<div class="bangumi-load-more"><button class="product-button secondary" type="button" data-bangumi-load-more>继续显示（剩余 '+remaining+' 部）</button></div>':'');
    }
    /* 同步期间增量刷新：只更新内容，不打断用户当前所在视图 */
    function liveGrid(rec){
      const i=CACHE.findIndex(x=>x.id===rec.id);
      if(i>=0)CACHE[i]=rec;else CACHE.push(rec);
      buildDatalists(CACHE);
      const grid=$('#bangumiDbGrid');
      if(grid&&!grid.hidden)renderGridContents();
      setStats();
      window.dispatchEvent(new CustomEvent('amorist-bangumi-cache-ready',{detail:{list:CACHE.slice()}}));
    }

    /* ── 详情（独立视图；本地未同步则懒加载并入库）── */
    let bgSelected=null;
    let bgListScrollY=0;
    let bgDetailRequestToken=0;
    let bgSortOrder=localStorage.getItem('amorist-bangumi-sort-order')||'desc';
    function bangumiYear(g){
      const y=Number(g.year)||parseInt(String(g.date||''),10);
      return Number.isFinite(y)&&y>0?y:null;
    }
    function bangumiCardMarkup(g,myGames){
      const imported=isImported(g,myGames),title=g.nameCn||g.name||('#'+g.id);
      const cover=g.cover?'<img loading="lazy" referrerpolicy="no-referrer" src="'+safe(g.cover)+'" alt="" onerror="this.style.display=\'none\'">':'';
      const year=bangumiYear(g),meta=[year?(year+'年'):'',g.developer||'',((g.chars&&g.chars.length)?(g.chars.length+' 角色'):'')].filter(Boolean);
      const selected=bgBatchSelected.has(String(g.id));
      return '<div class="bangumi-db-card'+(imported?' imported':'')+(bgBatchMode?' batch-mode':'')+(selected?' selected':'')+'" data-bgm-id="'+g.id+'">'
        +(bgBatchMode?'<input class="batch-select" type="checkbox" data-batch-bgm="'+safe(g.id)+'" '+(selected?'checked':'')+' aria-label="选择'+safe(title)+'">':'')
        +'<div class="bangumi-db-cover">'+(cover||safe(title).slice(0,1))+'</div>'
        +'<div class="bangumi-db-info"><h3>'+safe(title)+'</h3><div class="bgm-jp">'+safe(g.name||'')+'</div>'
        +'<div class="bgm-meta">'+meta.map(m=>'<span>'+safe(m)+'</span>').join('')+'</div>'
        +(imported?'<div class="bgm-imported-tag">✓ 已导入</div>':'')
        +'</div></div>';
    }
    function clearBangumiDetail(message='正在加载作品详情…'){
      const hero=$('#bangumiDbHero'),info=$('#bangumiDbInfoSection'),chars=$('#bangumiDbCharsGrid'),actions=$('#bangumiDbActions');
      if(hero)hero.innerHTML='<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--product-muted)">'+safe(message)+'</div>';
      if(info){info.hidden=true;info.innerHTML='';}
      if(chars)chars.innerHTML='';
      if(actions){const deleteButton=actions.querySelector('#bangumiDbDelete');if(deleteButton){deleteButton.hidden=true;deleteButton.dataset.bangumiDelete='';}}
    }
    async function showDetail(id){
      const requestToken=++bgDetailRequestToken;
      bgListScrollY=window.scrollY||document.documentElement.scrollTop||0;
      window.amoristProductNavigate?.('bangumi', true);
      switchResourceScreen('detail');
      bgSelected=null;
      clearBangumiDetail();
      let g=await dbGet(id);
      if(requestToken!==bgDetailRequestToken)return;
      if(!g){clearBangumiDetail('没有找到这部作品的资料');return;}
      if(!g.synced){
        try{
          const s=await v0('/v0/subjects/'+g.id);
          if(requestToken!==bgDetailRequestToken)return;
          let cl=[];try{cl=await v0('/v0/subjects/'+g.id+'/characters');}catch(e){}
          if(requestToken!==bgDetailRequestToken)return;
          g=Object.assign({},g,{
            name:s.name||g.name,nameCn:s.name_cn||g.nameCn||'',
            cover:imgFix((s.images&&(s.images.large||s.images.common||s.images.medium))||g.cover),
            developer:infoboxPick(s.infobox,DEV_KEYS)[0]||'',
            writers:infoboxPick(s.infobox,WRITER_KEYS),
            date:s.date||'',year:s.date?+String(s.date).slice(0,4):null,
            desc:s.summary||'',infobox:s.infobox||g.infobox||[],rank:s.rank||null,platforms:s.platform?[s.platform]:[],
            chars:normChars(cl),synced:true,updatedAt:Date.now()
          });
          await dbPut(g);
        }catch(e){toast('拉取详情失败：'+e.message);}
      }
      if(requestToken!==bgDetailRequestToken)return;
      try{g=await resolveVersionedDetail(g);}catch{}
      if(requestToken!==bgDetailRequestToken)return;
      bgSelected=g;
      paintDetail(g);
      window.scrollTo({top:0,behavior:'smooth'});
    }
    function characterInfoValue(value){
      if(value==null)return '';
      if(Array.isArray(value))return value.map(characterInfoValue).filter(Boolean).join(' / ');
      if(typeof value==='object')return value.v||value.k||value.name||'';
      return String(value);
    }
    async function showCharacterDetail(id){
      const modal=$('#bangumiCharModal'),body=$('#bangumiCharBody');
      if(!modal||!body)return;
      modal.hidden=false;
      body.innerHTML='<div style="padding:35px;text-align:center;color:var(--product-muted)">正在加载角色资料…</div>';
      try{
        const s=await v0('/v0/characters/'+encodeURIComponent(id));
        let characterSubjects=[];
        try{characterSubjects=await v0('/v0/characters/'+encodeURIComponent(id)+'/subjects');}catch{}
        const linked=(bgSelected&&Array.isArray(bgSelected.chars)?bgSelected.chars:[]).find(c=>String(c.id)===String(id))||{};
        const allCharacterRows=chars();
        const shared=allCharacterRows.find(c=>String(c.bangumiCharacterId||'')===String(id));
        const subjectIds=[...(Array.isArray(shared?.bangumiSubjectIds)?shared.bangumiSubjectIds:[]),shared?.bangumiSubjectId,...(Array.isArray(characterSubjects)?characterSubjects:[]).filter(subject=>Number(subject?.type)===4).map(subject=>subject.id)].filter(Boolean).map(String);
        const preferredSubjectId=String(bgSelected?.id||'')&&subjectIds.includes(String(bgSelected.id))?String(bgSelected.id):subjectIds.find(subjectId=>games().some(game=>String(game.bangumiId||'')===subjectId))||shared?.bangumiSubjectId||subjectIds[0]||'';
        if(shared&&subjectIds.length){shared.bangumiSubjectIds=[...new Set(subjectIds)];shared.bangumiSubjectId=preferredSubjectId;const linkedGame=games().find(game=>String(game.bangumiId||'')===preferredSubjectId)||games().find(game=>subjectIds.includes(String(game.bangumiId||'')));if(linkedGame){shared.gameId=shared.gameId||linkedGame.id;shared.gameIds=[...new Set([...(Array.isArray(shared.gameIds)?shared.gameIds:[]),linkedGame.id])];}}
        const title=s.name||linked.name||'角色资料';
        const image=imgFix(s.images&&(s.images.large||s.images.medium||s.images.grid||s.images.small)||linked.image||'');
        const actorNames=Array.isArray(s.actors)?s.actors.map(a=>a.name||a).filter(Boolean):[];
        if(!actorNames.length){const fallbackCv=linked.cv||shared?.cv||'';if(fallbackCv)actorNames.push(...String(fallbackCv).split(/\s*\/\s*/).filter(Boolean));}
        const actors=actorNames.join(' / ')||linked.cv||'';
        const localGame=shared?games().find(g=>String(g.id)===String(shared.gameId||'')||subjectIds.includes(String(g.bangumiId||''))):null;
        const workId=linked.bangumiSubjectId||shared?.bangumiSubjectId||subjectIds[0]||localGame?.bangumiId||'';
        const workTitle=localGame?.nameCn||localGame?.name||characterSubjects.find(subject=>String(subject.id)===String(workId))?.name_cn||characterSubjects.find(subject=>String(subject.id)===String(workId))?.name||'';
        const actorButtons=actorNames.map(actor=>'<button class="bgm-link-chip" type="button" data-bangumi-filter="cv" data-bangumi-value="'+safe(actor)+'">'+safe(actor)+'</button>').join('');
        const relationLinks=(workId||actorButtons)?'<div class="bangumi-char-links">'
          +(workId?'<div class="bangumi-char-link-row"><span>游戏</span><button class="bgm-link-chip" type="button" data-character-game="'+safe(workId)+'">'+safe(workTitle||'查看作品')+'</button></div>':'')
          +(actorButtons?'<div class="bangumi-char-link-row"><span>声优</span>'+actorButtons+'</div>':'')
          +'</div>':'';
        const characterInfobox=Array.isArray(s.infobox)&&s.infobox.length?s.infobox:(linked.infobox||shared?.infobox||[]);
        const infoRows=characterInfobox.filter(row=>characterInfoValue(row?.value).trim());
        const sourceRows=infoRows.filter(row=>/引用来源|来源/i.test(String(row.key||'')));
        const regularRows=infoRows.filter(row=>!sourceRows.includes(row));
        const ageRows=regularRows.filter(row=>/年龄|年齢/i.test(String(row.key||'')));
        const heightRows=regularRows.filter(row=>/身高|身長/i.test(String(row.key||'')));
        const orderedRows=[];let ageInserted=false;
        regularRows.forEach(row=>{
          if(ageRows.includes(row))return;
          if(heightRows.includes(row)&&!ageInserted){orderedRows.push(...ageRows);ageInserted=true;}
          orderedRows.push(row);
        });
        if(!ageInserted)orderedRows.push(...ageRows);
        orderedRows.push(...sourceRows);
        const info=orderedRows.map(row=>{
          const key=String(row.key||''),value=characterInfoValue(row.value),isSource=/引用来源|来源/i.test(key)&&/^https?:\/\//i.test(value.trim());
          const rendered=isSource?'<a class="bangumi-char-source-link" href="'+safe(value.trim())+'" target="_blank" rel="noopener noreferrer">'+safe(value.trim())+'</a>':safe(value);
          return '<div><strong>'+safe(key)+'</strong><span>'+rendered+'</span></div>';
        }).join('');
        if(shared){
          const names=characterSearchNames(s);
          shared.name=s.name||shared.name;shared.cv=shared.cv||actors;shared.image=shared.image||image;
          shared.nameCn=names.nameCn||shared.nameCn||'';shared.aliases=[...new Set([...(shared.aliases||[]),...names.aliases])];
          shared.summary=s.summary||shared.summary||'';shared.infobox=s.infobox||shared.infobox||[];shared.gender=s.gender||shared.gender||'';shared.nameSearchSynced=true;shared.birthdayCheckedAt=Date.now();shared.updatedAt=Date.now();
          saveChars(allCharacterRows);
          window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{chars:true}}));
        }
        const sharedNote=String(shared?.note||'').trim(),noteSection=sharedNote?'<p class="bangumi-char-note">'+safe(sharedNote)+'</p>':'';
        body.innerHTML='<div class="bangumi-char-hero"><div class="bangumi-char-image">'+(image?'<img src="'+safe(image)+'" alt="" referrerpolicy="no-referrer">':safe(title).slice(0,1))+'</div><div class="bangumi-char-copy"><h2 id="bangumiCharTitle">'+safe(title)+'</h2>'+relationLinks+'<p>'+safe(s.name_cn||'')+'</p>'+noteSection+'</div></div>'
          +(s.summary?'<section class="bangumi-char-section"><h3>角色简介</h3><p>'+safe(s.summary)+'</p></section>':'')
          +(info?'<section class="bangumi-char-section"><h3>角色资料</h3><div class="bangumi-char-infobox">'+info+'</div></section>':'');
      }catch(e){body.innerHTML='<div style="padding:35px;text-align:center;color:var(--product-muted)">角色资料加载失败：'+safe(e.message)+'</div>';}
    }
    window.openBangumiCharacterDetail=showCharacterDetail;
    window.addEventListener('amorist-open-character',e=>{if(e.detail)showCharacterDetail(e.detail);});
    function paintDetail(g){
      const myGames=games();
      const imported=isImported(g,myGames);
      const title=g.nameCn||g.name||('#'+g.id);
      const coverUrl=g.cover||'';
      const cover=coverUrl?'<img referrerpolicy="no-referrer" src="'+safe(coverUrl)+'" alt="" onerror="this.style.display=\'none\'">':'';
      const sub=[safe(g.name||''),g.year?(g.year+'年'):'',safe(g.developer||'')].filter(Boolean).join(' · ');
      $('#bangumiDbHero').innerHTML=
        '<div class="bangumi-db-hero-cover">'+(cover||safe(title).slice(0,1))+'</div>'
        +'<div class="bangumi-db-hero-info"><h2>'+safe(title)+'</h2>'
        +'<div class="bgm-hero-sub">'+sub+(imported?' · <span style="color:#48bb78;font-weight:600">已导入</span>':'')+'</div>'
        +(g.desc?'<div class="bgm-hero-desc">'+safe(g.desc)+'</div>':'')
        +(g.developer?'<div class="bgm-relationship-row"><span>厂商</span><button class="bgm-link-chip" type="button" data-bangumi-filter="maker" data-bangumi-value="'+safe(g.developer)+'">'+safe(g.developer)+'</button></div>':'')
        +((g.writers&&g.writers.length)?'<div class="bgm-relationship-row"><span>剧本</span>'+g.writers.map(w=>'<button class="bgm-link-chip" type="button" data-bangumi-filter="writer" data-bangumi-value="'+safe(w)+'">'+safe(w)+'</button>').join('')+'</div>':'')
        +'<div class="bgm-hero-platforms">'+(g.platforms||[]).map(p=>'<span>'+safe(p)+'</span>').join('')+'</div>'
        +'</div>';
      const deleteButton=$('#bangumiDbDelete');
      if(deleteButton){deleteButton.hidden=window.AMORIST_MODE!=='editor';deleteButton.dataset.bangumiDelete=g.id;}
      const infoRows=(g.infobox||[]).map(row=>{
        const key=row&&row.key!=null?row.key:'';
        const value=row&&row.value!=null?row.value:'';
        return key||value?'<div class="bangumi-db-info-row"><span class="bangumi-db-info-key">'+safe(key)+'</span><span class="bangumi-db-info-value">'+safe(Array.isArray(value)?value.join(' / '):value)+'</span></div>':'';
      }).join('');
      const infoSection=$('#bangumiDbInfoSection');
      if(infoSection){infoSection.hidden=!infoRows;infoSection.innerHTML=infoRows?'<h3>作品信息</h3><div class="bangumi-db-info-table">'+infoRows+'</div>':'';}
      const cl=g.chars||[];
      const charCard=c=>{
        const av=c.image?'<img loading="lazy" referrerpolicy="no-referrer" src="'+safe(c.image)+'" alt="" onerror="this.style.display=\'none\'">':'';
            return '<div class="bangumi-db-char"'+(c.id?' data-char-id="'+safe(c.id)+'"':'')+'><div class="char-avatar">'+(av||safe(c.name).slice(0,1))+'</div><div class="char-name">'+safe(c.name)+'</div><div class="char-cv">'+(c.cv?('<button class="bgm-link-chip" type="button" data-bangumi-filter="cv" data-bangumi-value="'+safe(c.cv)+'">CV '+safe(c.cv)+'</button>'):'')+'</div></div>';
      };
      const charBlock=(title,list)=>list.length?'<section class="bangumi-db-char-block"><h4>'+title+'</h4><div class="bangumi-db-chars-grid">'+list.map(charCard).join('')+'</div></section>':'';
      let charHtml='';
      if(cl.length){
        const groups={heroine:[],target:[],main:[],support:[],other:[]};
        cl.forEach(c=>groups[characterRoleGroup(c)].push(c));
        const explicit=groups.heroine.length||groups.target.length;
        if(explicit){
          charHtml=charBlock('女主角',groups.heroine)+charBlock('攻略对象',groups.target)+charBlock('其他主角',groups.main)+charBlock('配角',groups.support)+charBlock('其他角色',groups.other);
        }else if(groups.main.length||groups.support.length){
          charHtml=charBlock('主角',groups.main)+charBlock('配角',groups.support)+charBlock('其他角色',groups.other);
        }else{
          charHtml=charBlock('角色',cl);
        }
      }else charHtml='<div style="text-align:center;padding:30px;color:var(--product-muted)">暂无角色数据</div>';
      $('#bangumiDbCharsGrid').innerHTML=charHtml;
      const btn=$('#bangumiDbImport');
      if(btn)btn.textContent=imported?'重新导入（更新信息）':'导入到游戏档案';
    }

    /* ── 导入到游戏档案 + 角色图鉴 ── */
    async function ensureImportDetails(g){
      if(g&&g.synced&&Array.isArray(g.chars)&&g.chars.length){
        if(g.chars.every(c=>c.nameSearchSynced))return g;
        const enriched={...g,chars:await enrichCharacterSearchNames(g.chars),updatedAt:Date.now()};
        await dbPut(enriched);
        const cachedIndex=CACHE.findIndex(item=>String(item.id)===String(enriched.id));
        if(cachedIndex>=0)CACHE[cachedIndex]=enriched;
        return enriched;
      }
      const s=await v0('/v0/subjects/'+g.id);
      await sleep(450);
      let cl=[];try{cl=await v0('/v0/subjects/'+g.id+'/characters');}catch(e){cl=[];}
      const normalizedChars=await enrichCharacterSearchNames(normChars(cl));
      const full=Object.assign({},g,{
        name:s.name||g.name,nameCn:s.name_cn||g.nameCn||'',
        cover:imgFix((s.images&&(s.images.large||s.images.common||s.images.medium))||g.cover),
        developer:infoboxPick(s.infobox,DEV_KEYS)[0]||g.developer||'',writers:infoboxPick(s.infobox,WRITER_KEYS),
        date:s.date||g.date||'',year:s.date?+String(s.date).slice(0,4):g.year||null,
        desc:s.summary||g.desc||'',infobox:s.infobox||g.infobox||[],rank:s.rank||g.rank||null,
        platforms:s.platform?[s.platform]:(g.platforms||[]),chars:normalizedChars,versionResolveCheckedAt:0,versionResolveCompleted:false,characterSourceId:'',characterSourceName:'',inheritedCharacters:false,synced:true,updatedAt:Date.now()
      });
      await dbPut(full);
      const index=CACHE.findIndex(item=>String(item.id)===String(full.id));
      if(index>=0)CACHE[index]=full;else CACHE.push(full);
      // 导入与详情页使用同一套版本角色解析，确保角色挂在旧版/主条目时也能进入角色图鉴。
      return await resolveVersionedDetail(full);
    }
    function normalizedCharacterNames(character){
      return [character?.name,character?.nameCn,character?.name_cn,...(Array.isArray(character?.aliases)?character.aliases:[])]
        .map(value=>String(value||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase()).filter(Boolean);
    }
    function mergeCharacterRecord(target,source){
      const targetGames=[target.gameId,...(Array.isArray(target.gameIds)?target.gameIds:[])].filter(Boolean);
      const sourceGames=[source.gameId,...(Array.isArray(source.gameIds)?source.gameIds:[])].filter(Boolean);
      target.gameIds=[...new Set([...targetGames,...sourceGames])];
      target.gameId=target.gameId||source.gameId||target.gameIds[0]||'';
      target.bangumiCharacterId=target.bangumiCharacterId||source.bangumiCharacterId||'';
      target.bangumiSubjectId=target.bangumiSubjectId||source.bangumiSubjectId||'';
      target.name=target.name||source.name||'';target.nameCn=target.nameCn||source.nameCn||source.name_cn||'';
      target.aliases=[...new Set([...(Array.isArray(target.aliases)?target.aliases:[]),...(Array.isArray(source.aliases)?source.aliases:[])])];
      target.image=target.image||source.image||'';target.cv=target.cv||source.cv||'';
      if((!target.note||target.note==='自动从游戏路线导入')&&source.note&&source.note!=='自动从游戏路线导入')target.note=source.note;
      target.summary=target.summary||source.summary||'';target.infobox=(target.infobox&&target.infobox.length)?target.infobox:(source.infobox||[]);
      const targetPreference=dataModel.normalizeCharacterPreference(target.preference??target.relation),sourcePreference=dataModel.normalizeCharacterPreference(source.preference??source.relation);
      if(targetPreference==='unclassified'&&sourcePreference!=='unclassified')target.preference=sourcePreference;else target.preference=targetPreference;
      if(target.roleTypeSource!=='manual'){
        const sourceRole=dataModel.normalizeCharacterRoleType(source.roleType||dataModel.roleTypeFromBangumiRelation(source.relation));
        if(sourceRole!=='unset'||!target.roleType){target.roleType=sourceRole;target.roleTypeSource=source.roleTypeSource||'bangumi';}
      }
      target.nameSearchSynced=Boolean(target.nameSearchSynced||source.nameSearchSynced);target.updatedAt=Math.max(target.updatedAt||0,source.updatedAt||0,Date.now());
      return target;
    }
    function dedupeCharacterRecords(rows){
      const result=[];
      (Array.isArray(rows)?rows:[]).forEach(raw=>{
        const row={...raw},bangumiId=String(row.bangumiCharacterId||'').trim(),names=new Set(normalizedCharacterNames(row));
        let duplicate=result.find(existing=>bangumiId&&String(existing.bangumiCharacterId||'')===bangumiId);
        if(!duplicate){
          duplicate=result.find(existing=>{
            const existingNames=normalizedCharacterNames(existing),sameName=existingNames.some(name=>names.has(name));
            if(!sameName)return false;
            const existingBangumiId=String(existing.bangumiCharacterId||'').trim();
            if(bangumiId&&existingBangumiId)return false;
            if(bangumiId||existingBangumiId)return true;
            return Boolean(row.gameId&&existing.gameId&&String(row.gameId)===String(existing.gameId));
          });
        }
        if(duplicate)mergeCharacterRecord(duplicate,row);else result.push(row);
      });
      return result;
    }
    function migrateDuplicateCharacters(){
      const rows=chars(),cleaned=dedupeCharacterRecords(rows);
      if(cleaned.length===rows.length)return;
      saveChars(cleaned);
      window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{chars:true}}));
      toast('已合并 '+(rows.length-cleaned.length)+' 条重复角色记录');
    }
    function importGameRecords(records,{includeCharacters=true}={}){
      const allGames=games(),allChars=chars();
      let addedGames=0,addedChars=0;
      records.forEach(g=>{
        const linkedCharacters=allChars.filter(character=>{
          const subjectIds=[character.bangumiSubjectId,...(Array.isArray(character.bangumiSubjectIds)?character.bangumiSubjectIds:[])].filter(Boolean).map(String);
          return subjectIds.includes(String(g.id))||String(character.bangumiSubjectId||'')===String(g.bangumiId||'');
        });
        const importedCharacters=[...(g.chars||[])];
        linkedCharacters.forEach(character=>{if(!importedCharacters.some(item=>String(item.id||'')===String(character.bangumiCharacterId||'')||String(item.name||'')===String(character.name||'')))importedCharacters.push({...character,id:character.bangumiCharacterId||character.id});});
        const displayName=g.nameCn||g.name||('#'+g.id),routeNames=(g.chars||[]).filter(c=>['heroine','target','main'].includes(characterRoleGroup(c))).map(c=>c.name);
        const idx=allGames.findIndex(eg=>String(eg.bangumiId||'')===String(g.id)||eg.name===displayName||eg.name===g.name);
        const gameId=idx>=0?allGames[idx].id:('game-bgm-'+g.id);
        const prev=idx>=0?allGames[idx]:{};
        const record={...prev,
          id:gameId,bangumiId:g.id,name:displayName,status:prev.status||'尚未分类',category:window.AmoristDataModel.normalizeGameCategory(prev.category),progress:Number(prev.progress)||0,
          cover:g.cover||prev.cover||'',
          note:prev.note||'',
          sourceDescription:g.desc||prev.sourceDescription||'',developer:g.developer||prev.developer||'',writers:g.writers||prev.writers||[],
          bangumiDisplayId:g.id,
          bangumiCharacterSourceId:g.characterSourceId||prev.bangumiCharacterSourceId||'',
          bangumiVersionCheckedAt:g.versionResolveCheckedAt||prev.bangumiVersionCheckedAt||'',
          sourceCharacters:importedCharacters.length?importedCharacters:(prev.sourceCharacters||[]),platform:(g.platforms||[]).join('/'),hours:Number(prev.hours)||0,rating:Number(prev.rating)||0,
          routes:prev.routeSelectionCustomized?(prev.routes||[]):routeNames,routeSelectionCustomized:Boolean(prev.routeSelectionCustomized),routeDone:prev.routeDone||[],logs:prev.logs||[],updatedAt:Date.now()
        };
        if(idx>=0)allGames[idx]=record;else{allGames.push(record);addedGames++;}
        if(includeCharacters)importedCharacters.forEach(c=>{
          const existing=allChars.find(ec=>(c.id&&String(ec.bangumiCharacterId||'')===String(c.id))||(String(ec.gameId)===String(gameId)&&ec.name===c.name));
          if(existing){
            existing.gameIds=[...new Set([existing.gameId,...(Array.isArray(existing.gameIds)?existing.gameIds:[]),gameId].filter(Boolean))];
            existing.gameId=existing.gameId||gameId;existing.bangumiCharacterId=c.id||existing.bangumiCharacterId||'';existing.bangumiSubjectId=g.id;
            existing.cv=existing.cv||c.cv||'';existing.image=existing.image||c.image||'';existing.nameCn=c.nameCn||existing.nameCn||'';
            existing.aliases=[...new Set([...(Array.isArray(existing.aliases)?existing.aliases:[]),...(Array.isArray(c.aliases)?c.aliases:[])])];
            existing.summary=c.summary||existing.summary||'';
            if(Array.isArray(c.infobox)&&c.infobox.length){
              const currentInfo=Array.isArray(existing.infobox)?existing.infobox:[],keys=new Set(currentInfo.map(row=>String(row?.key||'')));
              existing.infobox=[...currentInfo,...c.infobox.filter(row=>{const key=String(row?.key||'');if(!key||keys.has(key))return false;keys.add(key);return true;})];
            }else if(!Array.isArray(existing.infobox))existing.infobox=[];
            existing.nameSearchSynced=Boolean(c.nameSearchSynced||existing.nameSearchSynced);
            existing.birthdayCheckedAt=c.birthdayCheckedAt||existing.birthdayCheckedAt||'';
            existing.preference=dataModel.normalizeCharacterPreference(existing.preference??existing.relation);
            if(existing.roleTypeSource!=='manual'){existing.roleType=dataModel.roleTypeFromBangumiRelation(c.relation);existing.roleTypeSource='bangumi';}
            existing.updatedAt=Date.now();
          }else{
            allChars.push({id:'char-bgm-'+g.id+'-'+(c.id||Math.random().toString(36).slice(2,8)),name:c.name,nameCn:c.nameCn||'',aliases:Array.isArray(c.aliases)?c.aliases:[],gameId,bangumiCharacterId:c.id||'',bangumiSubjectId:g.id,preference:'unclassified',roleType:dataModel.roleTypeFromBangumiRelation(c.relation),roleTypeSource:'bangumi',cv:c.cv||'',image:c.image||'',note:'',summary:c.summary||'',infobox:c.infobox||[],nameSearchSynced:Boolean(c.nameSearchSynced),birthdayCheckedAt:c.birthdayCheckedAt||'',updatedAt:Date.now()});
            addedChars++;
          }
        });
      });
      saveGames(allGames);if(includeCharacters)saveChars(dedupeCharacterRecords(allChars));
      window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{games:true,chars:includeCharacters}}));
      return {addedGames,addedChars,total:records.length};
    }
    async function doImport(){
      if(!bgSelected)return;
      const button=$('#bangumiDbImport');if(button)button.disabled=true;
      try{
        clearDeletedBangumiId(bgSelected.id);
        const g=await ensureImportDetails(bgSelected);bgSelected=g;
        const wantChars=$('#bangumiImportChars'),result=importGameRecords([g],{includeCharacters:!wantChars||wantChars.checked});
        toast(result.addedChars?('已导入「'+(g.nameCn||g.name)+'」及 '+result.addedChars+' 位角色到图鉴'):('已导入「'+(g.nameCn||g.name)+'」到游戏档案'));
        paintDetail(g);
      }catch(e){toast('导入失败：'+e.message);}finally{if(button)button.disabled=false;}
    }

    async function continueBatchImportDetails(records){
      let completed=0,failed=0,addedChars=0;
      setProgress('后台补全游戏与角色资料',0,records.length);
      for(const source of records){
        try{
          const detailed=await ensureImportDetails(source);
          const result=importGameRecords([detailed],{includeCharacters:true});
          addedChars+=result.addedChars;
        }catch(e){failed++;}
        completed++;
        setProgress('后台补全游戏与角色资料',completed,records.length);
      }
      setProgress('',0,0);
      renderGridContents();
      toast(failed
        ? `后台补全完成，${failed} 部失败，可稍后重试`
        : `后台补全完成，新增 ${addedChars} 位角色`);
    }

    let characterNameBackfillStarted=false;
    async function backfillExistingCharacterSearchNames(){
      if(characterNameBackfillStarted)return;
      characterNameBackfillStarted=true;
      const rows=chars(),targets=rows.filter(c=>c.bangumiCharacterId&&!c.nameSearchSynced);
      if(!targets.length)return;
      let updated=0;
      for(let index=0;index<targets.length;index++){
        const target=targets[index];
        try{
          const detail=await v0('/v0/characters/'+encodeURIComponent(target.bangumiCharacterId));
          const names=characterSearchNames(detail);
          target.name=detail.name||target.name;target.nameCn=names.nameCn||target.nameCn||'';
          target.aliases=[...new Set([...(Array.isArray(target.aliases)?target.aliases:[]),...names.aliases])];
          target.summary=detail.summary||target.summary||'';target.infobox=detail.infobox||target.infobox||[];
          target.nameSearchSynced=true;target.updatedAt=Date.now();updated++;
        }catch(e){}
        if((index+1)%6===0||index===targets.length-1){
          saveChars(rows);window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{chars:true}}));
        }
        if(index<targets.length-1)await sleep(180);
      }
      if(updated)toast('已补齐 '+updated+' 位角色的中文名与别名');
    }

    function setActiveDiscoveryLabel(type,value){
      const host=$('#bangumiActiveDiscovery');if(!host)return;
      const labels={maker:'厂商',cv:'声优',writer:'剧本娘',era:'年代'};
      if(!value){host.hidden=true;host.innerHTML='';return;}
      host.hidden=false;host.innerHTML='<span>正在探索 '+safe(labels[type]||'条件')+'：</span><button type="button" data-clear-discovery>'+safe(value)+'</button>';
      host.querySelector('[data-clear-discovery]')?.addEventListener('click',()=>window.amoristBangumiDiscovery.apply('', ''));
    }
    window.amoristBangumiDiscovery={
      getList:()=>CACHE.slice(),
      apply:(type,value)=>{
        ['bangumiDbSearch','bangumiDbMaker','bangumiDbCv','bangumiDbWriter'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
        bgEraFilter='';
        const map={q:'bangumiDbSearch',maker:'bangumiDbMaker',cv:'bangumiDbCv',writer:'bangumiDbWriter'};
        const cleaned=['maker','cv','writer'].includes(type)?canonicalEntityLabel(value):cleanOptionText(value);
        if(type==='era')bgEraFilter=String(value||'');
        else if(map[type]){const el=document.getElementById(map[type]);if(el)el.value=cleaned;}
        setActiveDiscoveryLabel(type,type==='era'?String(value||''):cleaned);
        window.amoristProductNavigate?.('bangumi', true);
        switchResourceScreen('search',{scroll:false});
        renderGrid();
      },
      random:(mode='any',open=false)=>{
        let rows=CACHE.slice();
        if(mode==='old')rows=rows.filter(g=>{const y=bangumiYear(g);return y&&y<2015;});
        if(!rows.length)return null;
        const g=rows[Math.floor(Math.random()*rows.length)];
        if(open)showDetail(Number(g.id));
        return g;
      },
      show:id=>showDetail(Number(id)),
      resolveById:async id=>{const record=await dbGet(Number(id));return record?resolveVersionedDetail(record):null;},
      openSearch:({focus=false,scroll=true}={})=>{switchResourceScreen('search',{scroll});if(focus)setTimeout(()=>$('#bangumiDbSearch')?.focus(),220);},
      getOptions:type=>({maker:MAKER_OPTS,cv:CV_OPTS,writer:WRITER_OPTS,game:GAME_OPTS}[type]||[]).map(option=>({...option,aliases:[...(option.aliases||[])]})),
      refresh:()=>refresh()
    };
    const STATIC_GAMES_URL='./data/bangumi-games.json';
    const STATIC_META_URL='./data/bangumi-meta.json';
    const STATIC_VERSION_KEY='amorist-bangumi-static-version';
    async function fetchStaticMeta(){
      try{const response=await fetch(STATIC_META_URL,{cache:'no-store'});if(!response.ok)return null;return await response.json();}catch{return null;}
    }
    async function loadStaticLibrary({silent=false,force=false}={}){
      try{
        const meta=await fetchStaticMeta();
        const remoteVersion=String(meta?.version??'');
        const localVersion=localStorage.getItem(STATIC_VERSION_KEY)||'';
        if(!force&&CACHE.length&&remoteVersion&&remoteVersion===localVersion)return false;
        if(!silent)setProgress('正在载入公共资料 JSON',0,1);
        const response=await fetch(STATIC_GAMES_URL,{cache:'no-store'});
        if(!response.ok)throw new Error('HTTP '+response.status);
        const payload=await response.json();
        const deleted=new Set(deletedBangumiIds());
        const rows=(Array.isArray(payload)?payload:(Array.isArray(payload?.games)?payload.games:[])).filter(row=>row&&row.id!=null&&!deleted.has(String(row.id)));
        if(!rows.length){if(!silent)toast('站点 JSON 暂无资料');setProgress('',0,0);return false;}
        await dbBulk(rows.filter(row=>row&&row.id!=null));
        if(remoteVersion)localStorage.setItem(STATIC_VERSION_KEY,remoteVersion);
        await refresh();
        setProgress('',0,0);
        if(!silent)toast('已载入 '+rows.length+' 部公共作品资料');
        return true;
      }catch(error){
        setProgress('',0,0);
        if(!silent)toast('载入站点 JSON 失败：'+error.message);
        return false;
      }
    }
    async function importLocalLibraryFile(file){
      if(!file)return false;
      try{
        setProgress('正在读取本地 JSON',0,1);
        const payload=JSON.parse(await file.text());
        const source=Array.isArray(payload)?payload:(Array.isArray(payload?.games)?payload.games:[]),merged=new Map();
        source.forEach(row=>{if(row&&row.id!=null)merged.set(String(row.id),row);});
        const rows=[...merged.values()];if(!rows.length)throw new Error('没有识别到包含 id 的作品记录');
        rows.forEach(row=>clearDeletedBangumiId(row.id));
        await dbBulk(rows);await refresh();setProgress('',0,0);toast('已从本地 JSON 合并 '+rows.length+' 部作品');closeBangumiManager();switchResourceScreen('search');return true;
      }catch(error){setProgress('',0,0);toast('本地 JSON 导入失败：'+error.message);return false;}
    }
    async function exportStaticLibrary(){
      const deleted=new Set(deletedBangumiIds()),rows=(await dbAll()).filter(row=>!deleted.has(String(row.id)));
      if(!rows.length){toast('资料库为空，暂无内容可导出');return;}
      const blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json;charset=utf-8'});
      const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='bangumi-games.json';link.click();
      setTimeout(()=>URL.revokeObjectURL(link.href),1000);
      toast('已导出 '+rows.length+' 部作品资料');
    }
    async function bootstrapStaticLibrary(){
      await refresh();
      const meta=await fetchStaticMeta();
      const remoteVersion=String(meta?.version??'');
      const localVersion=localStorage.getItem(STATIC_VERSION_KEY)||'';
      if(!CACHE.length||(remoteVersion&&remoteVersion!==localVersion))await loadStaticLibrary({silent:true,force:true});
    }
    /* ── 事件绑定 ── */
    async function searchSingleBangumiGames(){
      const input=$('#bangumiSingleSearch'),host=$('#bangumiSingleResults'),query=input?.value.trim();
      if(!input||!host)return;
      if(!query){host.innerHTML='<span class="playing-meta">请输入游戏名称。</span>';return;}
      host.innerHTML='<span class="playing-meta">正在搜索 Bangumi…</span>';
      try{
        const response=await fetch('https://api.bgm.tv/v0/search/subjects?limit=20&offset=0',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({keyword:query,sort:'match',filter:{type:[4]}})});
        if(!response.ok)throw new Error('HTTP '+response.status);
        const payload=await response.json(),rows=Array.isArray(payload.data)?payload.data:[];
        if(!rows.length){host.innerHTML='<span class="playing-meta">没有找到游戏，请换个名称试试。</span>';return;}
        host.innerHTML=rows.map(row=>{
          const title=row.name_cn||row.name||'未命名游戏',original=row.name&&row.name!==title?row.name:'',cover=imgFix(row.images?.common||row.images?.large||row.images?.medium||'');
          return `<div class="bangumi-single-result"><div class="bangumi-single-result-cover">${cover?`<img src="${safe(cover)}" alt="" referrerpolicy="no-referrer">`:''}</div><div class="bangumi-single-result-copy"><strong>${safe(title)}</strong><span>${safe(original)}${row.date?' · '+safe(row.date):''}</span></div><button class="product-button rose small" type="button" data-single-bgm-import="${safe(row.id)}">结构化导入</button></div>`;
        }).join('');
      }catch(error){host.innerHTML=`<span class="playing-meta">搜索失败：${safe(error.message)}</span>`;}
    }
    async function importSingleBangumiGame(id,button){
      if(!id||!button)return;
      button.disabled=true;button.textContent='导入中…';
      try{
        const raw=await v0('/subjects/'+encodeURIComponent(id));
        const detailed=await ensureImportDetails({id:Number(id),name:raw.name||'',name_cn:raw.name_cn||'',images:raw.images||{},date:raw.date||''});
        const result=importGameRecords([detailed],{includeCharacters:true});
        toast(`已结构化导入「${detailed.nameCn||detailed.name||id}」${result.addedChars?`，新增 ${result.addedChars} 名角色`:''}`);
        await refresh();
        button.textContent='已导入';
      }catch(error){button.disabled=false;button.textContent='结构化导入';toast('导入失败：'+error.message);}
    }
    const manageModal=$('#bangumiDbManageModal');
    function openBangumiManager(){if(manageModal)manageModal.hidden=false;}
    function closeBangumiManager(){
      if(!manageModal)return;
      manageModal.hidden=true;
      manageModal.classList.remove('is-minimized');
      if(manageMinimize)manageMinimize.textContent='−';
    }
    const manageBtn=$('#bangumiDbManage');if(manageBtn)manageBtn.addEventListener('click',openBangumiManager);
    const manageClose=$('#bangumiDbManageClose');if(manageClose)manageClose.addEventListener('click',closeBangumiManager);
    const manageMinimize=$('#bangumiDbManageMinimize');
    if(manageMinimize)manageMinimize.addEventListener('click',()=>{
      if(!manageModal)return;
      const minimized=manageModal.classList.toggle('is-minimized');
      manageMinimize.textContent=minimized?'□':'−';
    });
    if(manageModal)manageModal.addEventListener('click',e=>{if(e.target===manageModal)closeBangumiManager();});
    const singleSearchButton=$('#bangumiSingleSearchButton'),singleSearchInput=$('#bangumiSingleSearch'),singleResults=$('#bangumiSingleResults');
    if(singleSearchButton)singleSearchButton.addEventListener('click',searchSingleBangumiGames);
    if(singleSearchInput)singleSearchInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchSingleBangumiGames();}});
    if(singleResults)singleResults.addEventListener('click',event=>{const button=event.target.closest('[data-single-bgm-import]');if(button)importSingleBangumiGame(button.dataset.singleBgmImport,button);});
    const loadJsonBtn=$('#bangumiDbLoadJson');if(loadJsonBtn)loadJsonBtn.addEventListener('click',()=>loadStaticLibrary({force:true}));
    const localJsonBtn=$('#bangumiDbImportLocalJson'),localJsonInput=$('#bangumiDbLocalJsonFile');
    if(localJsonBtn&&localJsonInput){localJsonBtn.addEventListener('click',()=>localJsonInput.click());localJsonInput.addEventListener('change',async()=>{const file=localJsonInput.files&&localJsonInput.files[0];await importLocalLibraryFile(file);localJsonInput.value='';});}
    const exportJsonBtn=$('#bangumiDbExportJson');if(exportJsonBtn)exportJsonBtn.addEventListener('click',exportStaticLibrary);
    const syncBtn=$('#bangumiDbSync');if(syncBtn)syncBtn.addEventListener('click',syncLibrary);
    const detailSyncBtn=$('#bangumiDbDetailSync');if(detailSyncBtn)detailSyncBtn.addEventListener('click',syncDetailsOnly);
    const cancelBtn=$('#bangumiDbCancel');if(cancelBtn)cancelBtn.addEventListener('click',()=>{sync.cancel=true;if(syncCtl)syncCtl.abort();toast('正在暂停…');});
    ['bangumiDbSearch'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.addEventListener('input',renderGrid);
    });
    const clearBtn=$('#bangumiDbClear');
    if(clearBtn)clearBtn.addEventListener('click',()=>{
      ['bangumiDbSearch','bangumiDbMaker','bangumiDbCv','bangumiDbWriter'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
      bgEraFilter='';
      const activeFilter=$('#bangumiActiveDiscovery');if(activeFilter)activeFilter.hidden=true;
      document.querySelectorAll('.bgm-combo-list').forEach(l=>{l.hidden=true;});
      renderGrid();
    });
    const sortWrap=$('#bangumiDbSort');
    if(sortWrap){
      sortWrap.querySelectorAll('[data-bangumi-sort]').forEach(btn=>{
        btn.classList.toggle('active',btn.dataset.bangumiSort===bgSortOrder);
        btn.addEventListener('click',()=>{
          bgSortOrder=btn.dataset.bangumiSort;
          localStorage.setItem('amorist-bangumi-sort-order',bgSortOrder);
          sortWrap.querySelectorAll('[data-bangumi-sort]').forEach(item=>item.classList.toggle('active',item===btn));
          renderGrid();
        });
      });
    }
    initCombos();
    function updateBangumiBatchUi(){
      const count=$('#bangumiDbSelectedCount');if(count)count.textContent=bgBatchSelected.size;
      const actions=$('#bangumiDbBatchActions');if(actions)actions.hidden=!bgBatchMode;
      const toggle=$('#bangumiDbBatchToggle');if(toggle)toggle.textContent=bgBatchMode?'完成选择':'批量导入';
    }
    function closeBangumiBatch(){
      bgBatchMode=false;bgBatchSelected.clear();updateBangumiBatchUi();renderGridContents();
    }
    $$('[data-home-open-search]').forEach(button=>button.addEventListener('click',()=>{
      window.amoristProductNavigate?.('bangumi', true);
      window.amoristBangumiDiscovery?.openSearch({focus:true,scroll:false});
    }));
    $('#bangumiDbBatchToggle')?.addEventListener('click',()=>{
      if(resourceScreen!=='search')switchResourceScreen('search');
      bgBatchMode=!bgBatchMode;if(!bgBatchMode)bgBatchSelected.clear();updateBangumiBatchUi();renderGridContents();
    });
    $('#bangumiDbBatchCancel')?.addEventListener('click',closeBangumiBatch);
    $('#bangumiDbBatchAll')?.addEventListener('click',()=>{
      const visible=applyFilters(CACHE).map(g=>String(g.id));
      const allSelected=visible.length&&visible.every(id=>bgBatchSelected.has(id));
      visible.forEach(id=>allSelected?bgBatchSelected.delete(id):bgBatchSelected.add(id));
      updateBangumiBatchUi();renderGridContents();
    });
    $('#bangumiDbBatchImport')?.addEventListener('click',async()=>{
      if(!bgBatchSelected.size){toast('请先选择要导入的作品');return;}
      const button=$('#bangumiDbBatchImport'),selected=CACHE.filter(g=>bgBatchSelected.has(String(g.id)));
      button.disabled=true;
      const immediate=importGameRecords(selected,{includeCharacters:true});
      closeBangumiBatch();
      toast(`已立即导入 ${immediate.total} 部作品，详细资料将在后台补全`);
      void continueBatchImportDetails(selected);
      button.disabled=false;
      return;
      try{
        for(let i=0;i<selected.length;i++){
          setProgress('正在准备批量导入',i,selected.length);
          try{ready.push(await ensureImportDetails(selected[i]));}catch(e){failed++;}
        }
        const result=importGameRecords(ready,{includeCharacters:true});
        setProgress('',0,0);closeBangumiBatch();
        toast('已导入 '+result.total+' 部作品及 '+result.addedChars+' 位新角色'+(failed?'，'+failed+' 部失败':'') );
      }finally{button.disabled=false;setProgress('',0,0);}
    });
    const grid=$('#bangumiDbGrid');
    if(grid)grid.addEventListener('click',e=>{
      const more=e.target.closest('[data-bangumi-load-more]');
      if(more){bgRenderLimit+=BANGUMI_PAGE_SIZE;renderGridContents();return;}
      const card=e.target.closest('.bangumi-db-card');
      if(!card)return;
      const rawId=String(card.dataset.bgmId),id=Number(rawId);
      if(bgBatchMode){
        const checkbox=e.target.closest('[data-batch-bgm]');
        if(checkbox){if(checkbox.checked)bgBatchSelected.add(rawId);else bgBatchSelected.delete(rawId);}
        else if(bgBatchSelected.has(rawId))bgBatchSelected.delete(rawId);else bgBatchSelected.add(rawId);
        updateBangumiBatchUi();renderGridContents();return;
      }
      if(id)showDetail(id);
    });
    const backBtn=$('#bangumiDbBack');
    if(backBtn)backBtn.addEventListener('click',()=>{bgSelected=null;renderGridContents();switchResourceScreen('search',{scroll:false});requestAnimationFrame(()=>window.scrollTo({top:bgListScrollY,behavior:'auto'}));});
    const charGrid=$('#bangumiDbCharsGrid');
    if(charGrid)charGrid.addEventListener('click',e=>{const link=e.target.closest('[data-bangumi-filter]');if(link){e.stopPropagation();window.amoristBangumiDiscovery?.apply(link.dataset.bangumiFilter,link.dataset.bangumiValue);return;}const card=e.target.closest('[data-char-id]');if(card)showCharacterDetail(card.dataset.charId);});
    const charModal=$('#bangumiCharModal'),charClose=$('#bangumiCharClose');
    function closeCharacterDetail(){if(charModal)charModal.hidden=true;}
    if(charClose)charClose.addEventListener('click',closeCharacterDetail);
    if(charModal)charModal.addEventListener('click',e=>{if(e.target===charModal)closeCharacterDetail();});
    const charBody=$('#bangumiCharBody');
    if(charBody)charBody.addEventListener('click',e=>{
      const gameLink=e.target.closest('[data-character-game]');
      if(gameLink){e.preventDefault();closeCharacterDetail();showDetail(Number(gameLink.dataset.characterGame));return;}
      const filterLink=e.target.closest('[data-bangumi-filter]');
      if(filterLink){e.preventDefault();closeCharacterDetail();window.amoristBangumiDiscovery?.apply(filterLink.dataset.bangumiFilter,filterLink.dataset.bangumiValue);}
    });
    const importBtn=$('#bangumiDbImport');
    if(importBtn)importBtn.addEventListener('click',doImport);
    const heroHost=$('#bangumiDbHero');
    if(heroHost)heroHost.addEventListener('click',e=>{const link=e.target.closest('[data-bangumi-filter]');if(link)window.amoristBangumiDiscovery?.apply(link.dataset.bangumiFilter,link.dataset.bangumiValue);});
    const deleteButtonHost=$('#bangumiDbActions');
    if(deleteButtonHost)deleteButtonHost.addEventListener('click',async e=>{const button=e.target.closest('[data-bangumi-delete]');if(!button||window.AMORIST_MODE!=='editor')return;e.preventDefault();e.stopPropagation();const id=Number(button.dataset.bangumiDelete),record=CACHE.find(item=>Number(item.id)===id);if(!record||!confirm(`删除「${record.nameCn||record.name||id}」及其关联的游戏档案、角色资料？\n删除后将不会再次出现在 Bangumi 公共 JSON 中。`))return;try{const linkedGameIds=games().filter(game=>String(game.bangumiId||'')===String(id)||String(game.bangumiDisplayId||'')===String(id)).map(game=>String(game.id));await dbDelete(id);localStorage.setItem('amorist-bangumi-deleted-v1',JSON.stringify([...new Set([...deletedBangumiIds(),String(id)])]));saveGames(games().filter(game=>!linkedGameIds.includes(String(game.id))));const subjectId=String(id);saveChars(chars().filter(character=>{const subjectIds=[character.bangumiSubjectId,...(Array.isArray(character.bangumiSubjectIds)?character.bangumiSubjectIds:[])].filter(Boolean).map(String);const gameIds=[character.gameId,...(Array.isArray(character.gameIds)?character.gameIds:[])].filter(Boolean).map(String);return !subjectIds.includes(subjectId)&&!gameIds.some(gameId=>linkedGameIds.includes(gameId));}));CACHE=CACHE.filter(item=>Number(item.id)!==id);if(bgSelected&&Number(bgSelected.id)===id)bgSelected=null;buildDatalists(CACHE);renderGridContents();switchResourceScreen('search',{scroll:false});window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{games:true,chars:true}}));toast('作品、关联角色和游戏档案已删除');}catch(error){toast('删除失败：'+error.message);}});

    /* ── 页面激活时初始化 ── */
    let bgInited=false;
    function init(){if(bgInited)return;bgInited=true;bootstrapStaticLibrary();}
    const bgmPage=document.querySelector('.product-view[data-product-view="bangumi"]');
    if(bgmPage){
      const obs=new MutationObserver(()=>{if(bgmPage.classList.contains('active')){init();renderGrid();}});
      obs.observe(bgmPage,{attributes:true,attributeFilter:['class']});
    }
    init();
    migrateDuplicateCharacters();
    const characterPage=document.querySelector('.product-view[data-product-view="characters"]');
    if(characterPage){
      const characterObserver=new MutationObserver(()=>{if(characterPage.classList.contains('active'))backfillExistingCharacterSearchNames();});
      characterObserver.observe(characterPage,{attributes:true,attributeFilter:['class']});
      if(characterPage.classList.contains('active'))backfillExistingCharacterSearchNames();
    }
  })();
;

/* ===== workshopApp ===== */
(()=>{
  const view=document.querySelector('.product-view[data-product-view="forms"]');
  if(!view)return;
  const GAME_KEY='amorist-game-library-v1',CHAR_KEY='amorist-character-book-v1',KEY='amorist-workshop-current-v2',SAVED_KEY='amorist-workshop-sheets-v1',TEMPLATE_KEY='amorist-workshop-templates-v1';
  const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'');return v??fallback}catch{return fallback}};
      const games=()=>read(GAME_KEY,[]).filter(Boolean), chars=()=>window.AmoristCharacterBookVisibility.filter(read(CHAR_KEY,[]).filter(character=>character?.gameId||(!character?.animeId&&!Array.isArray(character?.animeIds))).filter(Boolean),games());
  const esc=value=>String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const initial=value=>String(value||'A').trim().slice(0,1).toUpperCase();
  const presets=[
    {id:'free',name:'自由创作',rows:3,cols:3,title:'我的视觉清单'},
    {id:'nine',name:'九宫格',rows:3,cols:3,title:'我的九部心选'},
    {id:'tier',name:'Tier 排名',rows:5,cols:4,title:'乙游作品 Tier'},
    {id:'characters',name:'角色图鉴',rows:3,cols:4,title:'我喜欢的角色'},
    {id:'mood',name:'偏好卡片',rows:2,cols:3,title:'乙游属性偏好'}
  ];
  const blank=(title='我的视觉清单',rows=3,cols=3)=>({title,header:'',rows,cols,width:960,height:720,spacing:'gap',showHeader:false,headerCells:Array.from({length:cols},()=>''),showText:true,slots:Array.from({length:rows*cols},()=>null),updatedAt:Date.now()});
  let state=read(KEY,null); if(!state||!state.slots)state=blank();
  let activeCell=-1,assetTab='games',assetRows=[];
  view.innerHTML=`<div class="product-page-head workshop-page-head">
    <div><h1>图文创作</h1><p>در ازل پرتوِ حُسنت ز تجلی دَم زد ,عشق پیدا شد و آتش به همه عالم زد</p></div>
    <div class="workshop-head-actions"><button class="product-button" id="workshopSave">保存图表</button><button class="product-button secondary" id="workshopSaveTemplate">保存模板</button><button class="product-button" id="workshopFullscreen">全屏截图</button></div>
  </div><div class="workshop-shell">
    <aside class="workshop-sidebar">
      <button class="workshop-new" id="workshopNew">＋ 自由创作</button>
      <div class="workshop-side-title">配色</div>
      <div class="workshop-color-row"><button data-workshop-color="gradient">渐变</button><button data-workshop-color="solid">浅色</button><button data-workshop-color="dark">深色</button></div><div class="workshop-palette-panel" id="workshopPalettePanel"></div>
    </aside>
    <main class="workshop-main">
      <div class="workshop-size-presets"><span>常见尺寸</span><button type="button" data-workshop-size="square">方形 1080 × 1080</button><button type="button" data-workshop-size="portrait">竖版 1080 × 1350</button><button type="button" data-workshop-size="landscape">横版 1920 × 1080</button><button type="button" data-workshop-size="a4">A4 1240 × 1754</button></div><div class="workshop-header-setting"><label><input id="workshopShowHeader" type="checkbox" ${state.showHeader?'checked':''}> 添加表头</label></div>
      <div class="workshop-main-head"><input id="workshopTitle" value="${esc(state.title)}" aria-label="图表标题"><span id="workshopSavedStatus">自动保存</span></div>
      <div class="workshop-settings"><label>宽 <input id="workshopWidth" type="number" min="320" max="2400" value="${state.width||960}"> px</label><label>高 <input id="workshopHeight" type="number" min="240" max="1800" value="${state.height||720}"> px</label><label>行 <input id="workshopRows" type="number" min="1" max="8" value="${state.rows}"></label><label>列 <input id="workshopCols" type="number" min="1" max="8" value="${state.cols}"></label><label>间距 <select id="workshopSpacing"><option value="gap" ${state.spacing!=='none'?'selected':''}>有边距</option><option value="none" ${state.spacing==='none'?'selected':''}>无边距</option></select></label><label><input id="workshopShowText" type="checkbox" ${state.showText!==false?'checked':''}> 显示图片文字</label><span>点击任意格子选择图片</span></div>
      <article class="workshop-sheet" id="workshopSheet"><header class="workshop-sheet-head"><input id="workshopHeader" value="${esc(state.header||'')}" placeholder="自定义表头（可留空）" aria-label="图表主标题"></header><div class="workshop-grid" id="workshopGrid"></div></article>
    </main>
    <aside class="workshop-library-sidebar">
      <div class="workshop-side-title">预设表格</div><div class="workshop-presets" id="workshopPresets"></div>
      <div class="workshop-side-title">预设表格</div><div class="workshop-presets" id="workshopTemplateList"></div>
      <div class="workshop-side-title">已保存图表</div><div class="workshop-presets" id="workshopSavedList"></div>
    </aside>
  </div>

  <div class="workshop-overlay" id="workshopOverlay"><section class="workshop-picker"><div class="workshop-picker-head"><h2>选择图片素材</h2><button class="workshop-picker-close" id="workshopPickerClose" type="button" aria-label="关闭图片素材选择">×</button></div><div class="workshop-picker-tabs"><button data-workshop-tab="games" class="active">游戏档案</button><button data-workshop-tab="chars">角色库</button><button data-workshop-tab="bangumi">Bangumi 搜索</button><button data-workshop-tab="upload">上传图片</button></div><div class="workshop-search" id="workshopSearchBox"><input id="workshopSearch" placeholder="搜索游戏或角色" aria-label="搜索游戏或角色"><button id="workshopSearchBtn">搜索</button></div><div class="workshop-picker-list" id="workshopPickerList"></div></section></div>`;
  const $=id=>document.getElementById(id), grid=$('workshopGrid'), overlay=$('workshopOverlay');
  document.body.insertAdjacentHTML('beforeend','<div class="workshop-overlay" id="workshopCropOverlay"><section class="workshop-crop-panel"><div class="workshop-picker-head"><h2>调整图片裁剪</h2><button class="workshop-picker-close" id="workshopCropClose" type="button" aria-label="关闭图片裁剪">×</button></div><div class="workshop-crop-preview"><img id="workshopCropPreview" alt="裁剪预览"></div><label class="workshop-crop-control"><span>上下位置</span><input id="workshopCropY" type="range" min="0" max="100" value="0"><output id="workshopCropYValue">0%</output></label><label class="workshop-crop-control"><span>缩放</span><input id="workshopCropScale" type="range" min="100" max="180" value="100"><output id="workshopCropScaleValue">100%</output></label><div class="workshop-crop-actions"><button id="workshopCropCancel" type="button">取消</button><button class="primary" id="workshopCropApply" type="button">应用裁剪</button></div></section></div>');
  const workshopSettings=document.querySelector('.workshop-settings'),headerSetting=document.querySelector('.workshop-header-setting');if(workshopSettings&&headerSetting)workshopSettings.append(headerSetting);
  const spacingSelect=$('workshopSpacing');if(workshopSettings&&spacingSelect&&!$('workshopNoGap')){const spacingOption=document.createElement('label');spacingOption.innerHTML='<input id="workshopNoGap" type="checkbox"> 无边距';workshopSettings.append(spacingOption);}
  const workshopShell=document.querySelector('.workshop-shell'),workshopLeft=document.querySelector('.workshop-sidebar'),workshopMainPanel=document.querySelector('.workshop-main'),presetList=$('workshopPresets'),savedList=$('workshopSavedList'),templateList=$('workshopTemplateList'),palettePanel=$('workshopPalettePanel');
  if(workshopLeft&&workshopSettings&&palettePanel){const settingsTitle=document.createElement('div');settingsTitle.className='workshop-side-title';settingsTitle.textContent='画布设置';const colorTitle=palettePanel.previousElementSibling?.previousElementSibling||palettePanel;workshopLeft.insertBefore(settingsTitle,colorTitle);workshopLeft.insertBefore(workshopSettings,colorTitle);}
  const save=()=>{state.title=$('workshopTitle').value.trim()||'未命名图表';state.header=$('workshopHeader').value;state.showText=$('workshopShowText').checked;state.updatedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(state));$('workshopSavedStatus').textContent='已自动保存';};
  const resize=(rows,cols)=>{rows=Math.max(1,Math.min(8,Number(rows)||3));cols=Math.max(1,Math.min(8,Number(cols)||3));const old=state.slots||[],oldHeaders=state.headerCells||[];state.rows=rows;state.cols=cols;state.slots=Array.from({length:rows*cols},(_,i)=>old[i]||null);state.headerCells=Array.from({length:cols},(_,i)=>oldHeaders[i]||'');$('workshopRows').value=rows;$('workshopCols').value=cols;render();save();};
  function render(){
    $('workshopTitle').value=state.title||'';$('workshopHeader').value=state.header||'';$('workshopShowText').checked=state.showText!==false;$('workshopShowHeader').checked=state.showHeader===true;
    grid.style.gridTemplateColumns=`repeat(${state.cols},minmax(0,1fr))`;grid.style.gridTemplateRows=`repeat(${state.rows},minmax(0,1fr))`;grid.style.aspectRatio=`${state.cols} / ${state.rows}`;grid.classList.toggle('no-gap',state.spacing==='none');grid.style.gap=state.spacing==='none'?'0':'18px';$('workshopSpacing').value=state.spacing==='none'?'none':'gap';$('workshopNoGap').checked=state.spacing==='none';$('workshopSheet').style.width='100%';$('workshopSheet').style.height='auto';$('workshopSheet').style.minHeight='0';
    let headerRow=$('workshopHeaderRow');if(!headerRow){headerRow=document.createElement('div');headerRow.id='workshopHeaderRow';headerRow.className='workshop-header-row';grid.parentNode.insertBefore(headerRow,grid);}headerRow.hidden=state.showHeader!==true;headerRow.style.gridTemplateColumns=`repeat(${state.cols},minmax(0,1fr))`;headerRow.style.gap=state.spacing==='none'?'0':'18px';const headerCells=Array.from({length:state.cols},(_,i)=>state.headerCells?.[i]||'');headerRow.innerHTML=headerCells.map((value,i)=>`<input data-workshop-header-cell="${i}" value="${esc(value)}" placeholder="表头文字" aria-label="第 ${i+1} 列表头">`).join('');
    grid.innerHTML=state.slots.map((item,i)=>`<div class="workshop-cell" data-workshop-cell="${i}" ${item?'':'role="button" tabindex="0" aria-label="为第 '+(i+1)+' 格选择图片"'}>${item?.cover?`<img src="${esc(item.cover)}" alt="${esc(item.name)}" style="object-position:50% 0;transform:translateY(-${Math.round((Number(item.cropY)||0)*.35)}%) scale(${Number(item.cropScale)||1});transform-origin:50% 50%" referrerpolicy="no-referrer">`:`<div class="workshop-cell-empty" aria-hidden="true">＋</div>`}${state.showText!==false?`<input class="workshop-cell-label" data-workshop-label="${i}" value="${esc(item?.label||item?.name||'')}" placeholder="添加一行文字" aria-label="第 ${i+1} 格说明文字">`:''}${item?'<button class="workshop-cell-remove" data-workshop-remove="'+i+'" type="button" aria-label="移除第 '+(i+1)+' 格图片">×</button><button class="workshop-cell-crop" data-workshop-crop="'+i+'" type="button" aria-label="裁剪第 '+(i+1)+' 格图片">裁</button>':''}</div>`).join('');
    document.querySelectorAll('[data-workshop-preset]').forEach(b=>b.classList.toggle('active',b.dataset.workshopPreset==='free'&&state.title==='我的视觉清单'));requestAnimationFrame(fitWorkshopCanvas);
  }
  function fitWorkshopCanvas(){if(view.classList.contains('workshop-screen-mode'))return;const main=document.querySelector('.workshop-main'),sheet=$('workshopSheet'),g=$('workshopGrid'),mainHead=document.querySelector('.workshop-main-head'),settings=document.querySelector('.workshop-settings'),sheetHead=sheet?.querySelector('.workshop-sheet-head'),headerRow=$('workshopHeaderRow');if(!main||!sheet||!g)return;const settingsH=main.contains(settings)?settings.offsetHeight:0,shellGap=22,chromeH=(mainHead?.offsetHeight||0)+settingsH+(sheetHead?.offsetHeight||0)+(headerRow&&!headerRow.hidden?headerRow.offsetHeight:0)+shellGap+28,availableW=Math.max(220,main.clientWidth-28),availableH=Math.max(160,main.clientHeight-chromeH),ratio=Math.max(.2,state.cols/state.rows),gridW=Math.min(availableW,availableH*ratio),gridH=gridW/ratio;g.style.width=`${Math.floor(gridW)}px`;g.style.height=`${Math.floor(gridH)}px`;sheet.style.width=`${Math.floor(gridW+28)}px`;sheet.style.height=`${Math.floor(gridH+(sheetHead?.offsetHeight||0)+(headerRow&&!headerRow.hidden?headerRow.offsetHeight:0)+28)}px`;}
  function renderPresets(){
    const list=$('workshopPresets');
    if(!list)return;
    list.innerHTML='';
    const heading=list.previousElementSibling;
    if(heading?.classList.contains('workshop-side-title'))heading.remove();
    const templateHeading=$('workshopTemplateList')?.previousElementSibling;
    if(templateHeading?.classList.contains('workshop-side-title'))templateHeading.textContent='\u9884\u8bbe\u8868\u683c';
  }
  function openPicker(index){activeCell=index;assetTab='games';document.querySelectorAll('[data-workshop-tab]').forEach(b=>b.classList.toggle('active',b.dataset.workshopTab==='games'));$('workshopSearch').value='';$('workshopSearchBox').style.display='flex';overlay.classList.add('open');renderAssets();}
  function closePicker(){overlay.classList.remove('open');}
  function renderAssets(rows=null){
    const list=$('workshopPickerList');
    if(assetTab==='upload'){list.innerHTML='<div class="workshop-upload" style="grid-column:1/-1"><button id="workshopUploadButton" class="workshop-new" type="button">选择本地图片</button><input id="workshopUploadInput" type="file" accept="image/*" hidden><p>图片会压缩后保存在当前图表中。</p></div>';const b=$('workshopUploadButton'),inp=$('workshopUploadInput');b.onclick=()=>inp.click();inp.onchange=e=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{const im=new Image();im.onload=()=>{const max=900,s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);state.slots[activeCell]={name:f.name.replace(/\.[^.]+$/,''),cover:c.toDataURL('image/jpeg',.82),label:f.name.replace(/\.[^.]+$/,'')};save();render();closePicker();};im.src=reader.result;};reader.readAsDataURL(f);};return;}
    rows=rows|| (assetTab==='games'?games():chars()); assetRows=rows;
    list.innerHTML=rows.length?rows.map(x=>{const name=x.name||x.nameCn||x.title||'未命名',cover=x.cover||x.image||x.images?.large||x.images?.common||'';return `<button class="workshop-pick" data-workshop-asset="${esc(x.id||x.character_id||name)}"><div class="workshop-pick-media">${cover?`<img src="${esc(cover)}" alt="${esc(name)}" referrerpolicy="no-referrer">`:`<div class="workshop-pick-placeholder">${initial(name)}</div>`}</div><span>${esc(name)}</span></button>`;}).join(''):'<div class="workshop-upload" style="grid-column:1/-1">暂时没有可用素材</div>';
  }
  async function bangumiSearch(){const q=$('workshopSearch').value.trim();if(!q)return;const list=$('workshopPickerList');list.innerHTML='<div class="workshop-upload" style="grid-column:1/-1">正在搜索 Bangumi…</div>';try{const body=JSON.stringify({keyword:q,limit:20,offset:0,filter:{type:[4]}});const headers={'Content-Type':'application/json','Accept':'application/json'};const [subjects,characters]=await Promise.all([fetch('https://api.bgm.tv/v0/search/subjects',{method:'POST',headers,body}),fetch('https://api.bgm.tv/v0/search/characters',{method:'POST',headers,body})]);const subjectData=subjects.ok?await subjects.json():{data:[]},charData=characters.ok?await characters.json():{data:[]};const rows=[...(subjectData.data||[]).map(x=>({id:x.id,name:x.name_cn||x.name,cover:x.images?.large||x.images?.common||'',kind:'作品'})),...(charData.data||[]).map(x=>({id:x.id,name:x.name,cover:x.images?.large||x.images?.common||'',kind:'角色'}))];renderAssets(rows);}catch{list.innerHTML='<div class="workshop-upload" style="grid-column:1/-1">Bangumi 搜索暂时不可用，请稍后重试或使用本地资料库。</div>';}}
  document.querySelectorAll('[data-workshop-tab]').forEach(b=>b.addEventListener('click',()=>{assetTab=b.dataset.workshopTab;document.querySelectorAll('[data-workshop-tab]').forEach(x=>x.classList.toggle('active',x===b));$('workshopSearchBox').style.display=assetTab==='upload'?'none':'flex';renderAssets();}));
  let cropIndex=-1;function openCrop(index){const item=state.slots[index];if(!item?.cover)return;cropIndex=index;$('workshopCropPreview').src=item.cover;$('workshopCropY').value=Number(item.cropY)||0;$('workshopCropScale').value=Math.round((Number(item.cropScale)||1)*100);$('workshopCropYValue').textContent=$('workshopCropY').value+'%';$('workshopCropScaleValue').textContent=$('workshopCropScale').value+'%';updateCropPreview();$('workshopCropOverlay').classList.add('open');}function updateCropPreview(){const p=$('workshopCropPreview'),y=Number($('workshopCropY').value)||0,s=Number($('workshopCropScale').value)/100;p.style.objectPosition='50% 0';p.style.transform=`translateY(-${y*.35}%) scale(${s})`;p.style.transformOrigin='50% 50%';}let cropDragging=false,cropDragStart=0,cropDragValue=0;const cropPreview=$('workshopCropPreview');cropPreview.parentElement.addEventListener('pointerdown',e=>{cropDragging=true;cropDragStart=e.clientY;cropDragValue=Number($('workshopCropY').value)||0;cropPreview.parentElement.setPointerCapture?.(e.pointerId);});cropPreview.parentElement.addEventListener('pointermove',e=>{if(!cropDragging)return;const delta=(e.clientY-cropDragStart)/Math.max(1,cropPreview.parentElement.clientHeight)*100/.35;const next=Math.max(0,Math.min(100,cropDragValue-delta));$('workshopCropY').value=Math.round(next);$('workshopCropYValue').textContent=Math.round(next)+'%';updateCropPreview();});cropPreview.parentElement.addEventListener('pointerup',()=>{cropDragging=false;});cropPreview.parentElement.addEventListener('pointercancel',()=>{cropDragging=false;});function closeCrop(){$('workshopCropOverlay').classList.remove('open');cropIndex=-1;}$('workshopCropY').oninput=()=>{$('workshopCropYValue').textContent=$('workshopCropY').value+'%';updateCropPreview();};$('workshopCropScale').oninput=()=>{$('workshopCropScaleValue').textContent=$('workshopCropScale').value+'%';updateCropPreview();};$('workshopCropClose').onclick=closeCrop;$('workshopCropCancel').onclick=closeCrop;$('workshopCropOverlay').onclick=e=>{if(e.target.id==='workshopCropOverlay')closeCrop();};$('workshopCropApply').onclick=()=>{if(cropIndex<0)return;const item=state.slots[cropIndex];item.cropY=Number($('workshopCropY').value);item.cropScale=Number($('workshopCropScale').value)/100;save();render();closeCrop();};
  grid.addEventListener('click',e=>{const remove=e.target.closest('[data-workshop-remove]');if(remove){e.stopPropagation();state.slots[Number(remove.dataset.workshopRemove)]=null;save();render();return;}const crop=e.target.closest('[data-workshop-crop]');if(crop){e.stopPropagation();openCrop(Number(crop.dataset.workshopCrop));return;}const cell=e.target.closest('[data-workshop-cell]');if(cell&&!e.target.closest('input'))openPicker(Number(cell.dataset.workshopCell));});
  grid.addEventListener('keydown',e=>{const cell=e.target.closest('[data-workshop-cell][role="button"]');if(!cell||e.target!==cell||!['Enter',' '].includes(e.key))return;e.preventDefault();openPicker(Number(cell.dataset.workshopCell));});
  grid.addEventListener('input',e=>{const input=e.target.closest('[data-workshop-label]');if(!input)return;const item=state.slots[Number(input.dataset.workshopLabel)];if(item){item.label=input.value;save();}});
  document.addEventListener('input',e=>{const input=e.target.closest('[data-workshop-header-cell]');if(!input)return;state.headerCells=state.headerCells||[];state.headerCells[Number(input.dataset.workshopHeaderCell)]=input.value;save();});
  $('workshopPickerClose').onclick=closePicker;overlay.addEventListener('click',e=>{if(e.target===overlay)closePicker();});
  $('workshopPickerList').addEventListener('click',e=>{const pick=e.target.closest('[data-workshop-asset]');if(!pick)return;const source=assetTab==='bangumi'?assetRows:(assetTab==='games'?games():chars()),item=source.find(x=>String(x.id||x.character_id||x.name)===String(pick.dataset.workshopAsset));if(item){state.slots[activeCell]={gameId:assetTab==='games'||assetTab==='bangumi'?item.id:undefined,charId:assetTab==='chars'?item.id:undefined,name:item.name||item.nameCn||item.title,cover:item.cover||item.image||item.images?.large||item.images?.common||'',label:item.name||item.nameCn||item.title};save();render();closePicker();}});
  $('workshopSearchBtn').onclick=bangumiSearch;$('workshopSearch').addEventListener('keydown',e=>{if(e.key==='Enter')bangumiSearch();});
  $('workshopShowHeader').onchange=()=>{state.showHeader=$('workshopShowHeader').checked;save();render();};$('workshopNoGap').onchange=()=>{state.spacing=$('workshopNoGap').checked?'none':'gap';save();render();};$('workshopWidth').onchange=e=>{state.width=Math.max(320,Math.min(2400,Number(e.target.value)||960));save();render();};$('workshopHeight').onchange=e=>{state.height=Math.max(240,Math.min(1800,Number(e.target.value)||720));save();render();};$('workshopRows').onchange=e=>resize(e.target.value,state.cols);$('workshopCols').onchange=e=>resize(state.rows,e.target.value);$('workshopSpacing').onchange=e=>{state.spacing=e.target.value;save();render();};$('workshopShowText').onchange=()=>{state.showText=$('workshopShowText').checked;save();render();};$('workshopTitle').oninput=save;$('workshopHeader').oninput=save;
  const sizePresets={square:[1080,1080],portrait:[1080,1350],landscape:[1920,1080],a4:[1240,1754]};document.querySelectorAll('[data-workshop-size]').forEach(button=>button.addEventListener('click',()=>{const size=sizePresets[button.dataset.workshopSize];if(!size)return;state.width=size[0];state.height=size[1];save();render();}));
  $('workshopNew').onclick=()=>{state=blank();save();render();};
  $('workshopPresets').addEventListener('click',e=>{const b=e.target.closest('[data-workshop-preset]');if(!b)return;const p=presets.find(x=>x.id===b.dataset.workshopPreset);state=blank(p.title,p.rows,p.cols);save();render();});
  const workshopThemes=[{name:'配色',items:[
    {id:'macaronPink',name:'樱花粉',vars:{pageBg1:'#fff5f6',paper:'#fffafb',ink:'#5b3b45',muted:'#9b7780',line:'#efd6dc',primaryStrong:'#bd7184',accent:'#e7a8b8'}},
    {id:'macaronLavender',name:'薰衣草紫',vars:{pageBg1:'#f7f4ff',paper:'#fcfaff',ink:'#463b5c',muted:'#887da0',line:'#ded5f0',primaryStrong:'#9179b8',accent:'#c8b7e7'}},
    {id:'macaronMint',name:'薄荷绿',vars:{pageBg1:'#f1fbf7',paper:'#fbfffd',ink:'#36564c',muted:'#76968c',line:'#cfe8df',primaryStrong:'#6ea695',accent:'#a9d8c7'}},
    {id:'macaronCream',name:'奶油黄',vars:{pageBg1:'#fffaf0',paper:'#fffdf7',ink:'#5c5037',muted:'#998a68',line:'#eadfbd',primaryStrong:'#b89b52',accent:'#e6cf8e'}},
    {id:'macaronBlue',name:'天空蓝',vars:{pageBg1:'#f2f9ff',paper:'#fbfdff',ink:'#38516a',muted:'#7890a5',line:'#d2e3f0',primaryStrong:'#6e98bb',accent:'#a9cbe5'}}
  ,
    {id:'workshopBlack',name:'黑底白字',vars:{pageBg1:'#000000',paper:'#000000',ink:'#FFFFFF',muted:'#FFFFFF',line:'#FFFFFF',primaryStrong:'#FFFFFF',accent:'#FFFFFF'}},
    {id:'workshopWhite',name:'白底黑字',vars:{pageBg1:'#FFFFFF',paper:'#FFFFFF',ink:'#000000',muted:'#000000',line:'#000000',primaryStrong:'#000000',accent:'#000000'}}
  ]}];
  function workshopThemeById(id){return workshopThemes.flatMap(group=>group.items).find(item=>item.id===id)||workshopThemes[0].items[0];}
  function applyWorkshopTheme(style,id,remember=true){const row=workshopThemeById(id);if(!row)return;const v=row.vars;const vars={pageBg1:'--workshop-bg',paper:'--workshop-paper',ink:'--workshop-ink',muted:'--workshop-muted',line:'--workshop-line',primaryStrong:'--workshop-plum',accent:'--workshop-accent'};Object.entries(vars).forEach(([from,to])=>view.style.setProperty(to,v[from]));const sheet=$('workshopSheet');if(sheet){sheet.style.backgroundColor=v.paper;sheet.style.color=v.ink;sheet.style.borderColor=v.line;}state.paletteStyle='workshop';state.paletteId=row.id;if(remember)save();renderPalettePanel();}
  function renderPalettePanel(){const panel=$('workshopPalettePanel');if(!panel)return;const items=workshopThemes.flatMap(group=>group.items);panel.innerHTML=`<div class="workshop-palette-grid">${items.map(item=>`<button class="workshop-palette-card${state.paletteId===item.id?' active':''}" data-workshop-palette-style="workshop" data-workshop-palette-id="${item.id}" type="button"><span><span class="workshop-palette-swatches"><i style="background:${item.vars.paper}"></i><i style="background:${item.vars.primaryStrong}"></i><i style="background:${item.vars.accent}"></i></span><small class="workshop-palette-name">${esc(item.name)}</small></span><span>›</span></button>`).join('')}</div>`;}
  $('workshopPalettePanel').addEventListener('click',e=>{const b=e.target.closest('[data-workshop-palette-id]');if(b)applyWorkshopTheme('workshop',b.dataset.workshopPaletteId);});
  function savedItemMarkup(x,type){return `<div class="workshop-list-item"><button class="workshop-preset" data-workshop-${type}="${esc(x.id)}"><span>${esc(x.name||x.title||'未命名')}</span><small>${x.rows} × ${x.cols}</small></button><button class="workshop-list-delete" data-workshop-delete-${type}="${esc(x.id)}" type="button" aria-label="删除${esc(x.name||x.title||'条目')}">×</button></div>`;}
  function renderSaved(){const saved=read(SAVED_KEY,[]);$('workshopSavedList').innerHTML=saved.length?saved.map(x=>savedItemMarkup(x,'saved')).join(''):'<span class="workshop-list-empty">还没有保存的图表</span>';}
  function renderTemplates(){const templates=read(TEMPLATE_KEY,[]);$('workshopTemplateList').innerHTML=templates.length?templates.map(x=>savedItemMarkup(x,'template')).join(''):'<span class="workshop-list-empty">还没有自定义模板</span>';}
  $('workshopSavedList').addEventListener('click',e=>{
    const del=e.target.closest('[data-workshop-delete-saved]');
    if(del){const rows=read(SAVED_KEY,[]),item=rows.find(x=>x.id===del.dataset.workshopDeleteSaved);if(item&&confirm(`删除图表「${item.title||'未命名图表'}」？`)){localStorage.setItem(SAVED_KEY,JSON.stringify(rows.filter(x=>x.id!==item.id)));renderSaved();}return;}
    const b=e.target.closest('[data-workshop-saved]');if(!b)return;const item=read(SAVED_KEY,[]).find(x=>x.id===b.dataset.workshopSaved);if(item){state=JSON.parse(JSON.stringify(item));render();save();applyWorkshopTheme('workshop',state.paletteId||'macaronPink',false);}
  });
  $('workshopTemplateList').addEventListener('click',e=>{
    const del=e.target.closest('[data-workshop-delete-template]');
    if(del){const rows=read(TEMPLATE_KEY,[]),item=rows.find(x=>x.id===del.dataset.workshopDeleteTemplate);if(item&&confirm(`删除模板「${item.name||'未命名模板'}」？`)){localStorage.setItem(TEMPLATE_KEY,JSON.stringify(rows.filter(x=>x.id!==item.id)));renderTemplates();}return;}
    const b=e.target.closest('[data-workshop-template]');if(!b)return;const item=read(TEMPLATE_KEY,[]).find(x=>x.id===b.dataset.workshopTemplate);if(item){state={...JSON.parse(JSON.stringify(item)),id:undefined,slots:Array.from({length:item.rows*item.cols},()=>null),updatedAt:Date.now()};render();save();applyWorkshopTheme('workshop',state.paletteId||'macaronPink',false);}
  });
  $('workshopSave').onclick=()=>{const saved=read(SAVED_KEY,[]);saved.unshift({...state,id:'sheet-'+Date.now()});localStorage.setItem(SAVED_KEY,JSON.stringify(saved.slice(0,30)));save();renderSaved();$('workshopSavedStatus').textContent='图表已保存';if(typeof toast==='function')toast('图表已保存');};
  $('workshopSaveTemplate').onclick=()=>{const name=prompt('模板名称',state.title||'我的模板');if(name===null)return;const templates=read(TEMPLATE_KEY,[]),template={...JSON.parse(JSON.stringify(state)),id:'template-'+Date.now(),name:name.trim()||'未命名模板',slots:Array.from({length:state.rows*state.cols},()=>null),updatedAt:Date.now()};templates.unshift(template);localStorage.setItem(TEMPLATE_KEY,JSON.stringify(templates.slice(0,30)));renderTemplates();$('workshopSavedStatus').textContent='模板已保存';if(typeof toast==='function')toast('模板已保存');};
  async function exportImage(){const sheet=$('workshopSheet');const oldTransform=sheet.style.transform,oldOrigin=sheet.style.transformOrigin;try{if(!window.html2canvas)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});const fit=Math.min(1,(window.innerWidth-48)/sheet.offsetWidth,(window.innerHeight-48)/sheet.offsetHeight);sheet.style.transformOrigin='top center';sheet.style.transform=`scale(${Math.max(.35,fit)})`;await new Promise(requestAnimationFrame);const c=await html2canvas(sheet,{scale:2,useCORS:true,backgroundColor:null});const a=document.createElement('a');a.download=(state.title||'创作工坊')+'.png';a.href=c.toDataURL('image/png');a.click();}catch{if(typeof toast==='function')toast('导出失败，请重试');}finally{sheet.style.transform=oldTransform;sheet.style.transformOrigin=oldOrigin;}}
  $('workshopExport')?.addEventListener('click',exportImage);$('workshopFullscreen').onclick=async()=>{const sheet=$('workshopSheet'),screenView=view;screenView.classList.add('workshop-screen-mode');try{await document.documentElement.requestFullscreen?.();await new Promise(requestAnimationFrame);const fit=Math.min(1,(window.innerWidth-48)/sheet.offsetWidth,(window.innerHeight-48)/sheet.offsetHeight);sheet.style.transformOrigin='50% 50%';sheet.style.transform=`scale(${Math.max(.25,fit)})`;await exportImage();}catch{await exportImage();}};document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&view.classList.contains('workshop-screen-mode')){$('workshopSheet').style.transform='';view.classList.remove('workshop-screen-mode');}});
  window.addEventListener('resize',fitWorkshopCanvas);const workshopMain=document.querySelector('.workshop-main');if(workshopMain&&window.ResizeObserver)new ResizeObserver(()=>requestAnimationFrame(fitWorkshopCanvas)).observe(workshopMain);new MutationObserver(()=>{if(view.classList.contains('active'))requestAnimationFrame(fitWorkshopCanvas);}).observe(view,{attributes:true,attributeFilter:['class']});renderPresets();renderSaved();renderTemplates();renderPalettePanel();render();
  const savedTheme=state.paletteId?{style:'workshop',id:state.paletteId}:null,defaultTheme=savedTheme||{style:'workshop',id:'macaronPink'};applyWorkshopTheme(defaultTheme.style,defaultTheme.id,false);
})();
;

/* ===== repoProfilePatternBridge ===== */
(()=>{
  const actions=document.getElementById('repoProductActions');
  const pageSwitch=document.getElementById('pageSwitch');
  const screenshot=document.getElementById('screenshotBtn');
  if(actions&&pageSwitch)actions.append(pageSwitch);
  if(actions&&screenshot){screenshot.classList.add('product-button');actions.append(screenshot);}
})();
;

/* ===== amoristProductEnhancementScript ===== */
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const splitPeople = value => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(splitPeople);
    if (typeof value === 'object') return splitPeople(value.name || value.value || value.v || '');
    return String(value).split(/[\/／,，、;；|｜\n]+/).map(item => item.trim()).filter(Boolean);
  };
  const topValues = (values, limit = 6) => {
    const counts = new Map();
    values.flatMap(splitPeople).forEach(value => {
      const key = value.normalize('NFKC').replace(/[\s　]+/g, '').toLowerCase();
      if (!key) return;
      const current = counts.get(key) || {value, count:0};
      current.count += 1;
      counts.set(key, current);
    });
    return [...counts.values()].sort((a,b) => b.count - a.count || a.value.localeCompare(b.value, 'zh-CN')).slice(0, limit).map(item => item.value);
  };

  /* Mobile “More” sheet keeps the bottom navigation to five clear actions. */
  const moreSheet = $('#mobileMoreSheet');
  const moreToggle = $('#mobileMoreToggle');
  const moreClose = $('#mobileMoreClose');
  const setPageInert = value => {
    const shell = document.querySelector('.product-shell');
    const mobileNav = document.querySelector('.mobile-nav');
    if (shell) shell.inert = value;
    if (mobileNav) mobileNav.inert = value;
  };
  const openMore = () => {
    if (!moreSheet) return;
    moreSheet.hidden = false;
    document.body.classList.add('mobile-sheet-open');
    setPageInert(true);
    requestAnimationFrame(() => moreClose?.focus());
  };
  const closeMore = ({restoreFocus=true} = {}) => {
    if (!moreSheet || moreSheet.hidden) return;
    moreSheet.hidden = true;
    document.body.classList.remove('mobile-sheet-open');
    setPageInert(false);
    if (restoreFocus) moreToggle?.focus();
  };
  moreToggle?.addEventListener('click', openMore);
  moreClose?.addEventListener('click', () => closeMore());
  $('#mobileMoreBackdrop')?.addEventListener('click', () => closeMore());
  moreSheet?.querySelectorAll('[data-product-target]').forEach(button => button.addEventListener('click', () => closeMore({restoreFocus:false})));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMore(); });

  let discoveryList = [];
  let featureId = null;
  let renderTimer = 0;
  const discoveryPools = { maker: [], writer: [], cv: [] };
  const discoverySelections = { maker: [], writer: [], cv: [] };
  const discoveryConfig = {
    maker: { hostId: 'bangumiMakerChips', count: 6 },
    writer: { hostId: 'bangumiWriterChips', count: 6 },
    cv: { hostId: 'bangumiCvChips', count: 7 }
  };

  function shuffledEntries(entries) {
    const rows = Array.isArray(entries) ? entries.slice() : [];
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return rows;
  }

  function randomDiscoveryEntries(type) {
    const config = discoveryConfig[type];
    if (!config) return [];
    const pool = discoveryPools[type] || [];
    if (pool.length <= config.count) return shuffledEntries(pool);
    const previous = new Set((discoverySelections[type] || []).map(entry => entry.label));
    let next = shuffledEntries(pool).slice(0, config.count);
    if (next.every(entry => previous.has(entry.label))) {
      const alternative = pool.find(entry => !previous.has(entry.label));
      if (alternative) next[next.length - 1] = alternative;
    }
    return next;
  }

  function cycleDiscovery(type, sourceButton = null) {
    const config = discoveryConfig[type];
    if (!config) return;
    const next = randomDiscoveryEntries(type);
    discoverySelections[type] = next;
    renderChipList(config.hostId, next, type);
    if (sourceButton) {
      sourceButton.classList.remove('is-cycling');
      void sourceButton.offsetWidth;
      sourceButton.classList.add('is-cycling');
      setTimeout(() => sourceButton.classList.remove('is-cycling'), 380);
    }
  }

  function renderChipList(hostId, entries, type) {
    const host = document.getElementById(hostId);if (!host) return;
    host.innerHTML = entries.length
      ? entries.map(entry => `<button type="button" data-resource-filter="${type}" data-resource-value="${esc(entry.label)}"><span>${esc(entry.label)}</span><small>${Number(entry.count)||0} 部</small></button>`).join('')
      : '<span class="playing-meta">资料补齐后会显示可探索的名字</span>';
  }

  function renderFeature(game) {
    const host = $('#bangumiDiscoveryFeature');
    if (!host) return;
    if (!game) {
      host.innerHTML = '<div class="feature-placeholder"><span>✦</span><strong>等待一次发现</strong><small>同步或载入资料 JSON 后，这里会出现一部随机作品。</small></div>';
      featureId = null;
      return;
    }
    featureId = String(game.id);
    const title = game.nameCn || game.name || `#${game.id}`;
    const year = Number(game.year) || parseInt(String(game.date || ''), 10) || '';
    const meta = [year ? `${year}年` : '', game.developer || '', Array.isArray(game.chars) && game.chars.length ? `${game.chars.length} 位角色` : ''].filter(Boolean).join(' · ');
    host.innerHTML = `<div class="discovery-feature-content" data-open-feature="${esc(game.id)}">
      <div class="discovery-feature-copy"><span>TODAY'S PICK</span><h3>${esc(title)}</h3>${meta?`<p>${esc(meta)}</p>`:''}<button type="button">查看作品 →</button></div>
      <div class="discovery-feature-cover">${game.cover ? `<img src="${esc(game.cover)}" alt="${esc(title)}" loading="lazy" referrerpolicy="no-referrer">` : esc(title).slice(0,1)}</div>
    </div>`;
  }

  function renderDiscovery(list) {
    discoveryList = Array.isArray(list) ? list.filter(Boolean) : [];
    discoveryPools.maker = window.amoristBangumiDiscovery?.getOptions('maker') || [];
    discoveryPools.writer = window.amoristBangumiDiscovery?.getOptions('writer') || [];
    discoveryPools.cv = window.amoristBangumiDiscovery?.getOptions('cv') || [];
    cycleDiscovery('maker');
    cycleDiscovery('writer');
    cycleDiscovery('cv');
    const retained = featureId && discoveryList.find(game => String(game.id) === featureId);
    if (retained) renderFeature(retained);
    else renderFeature(discoveryList.length ? discoveryList[Math.floor(Math.random() * discoveryList.length)] : null);
  }

  function scheduleDiscovery(list) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => renderDiscovery(list), 120);
  }

  window.addEventListener('amorist-bangumi-cache-ready', event => scheduleDiscovery(event.detail?.list || []));
  if (window.amoristBangumiDiscovery) scheduleDiscovery(window.amoristBangumiDiscovery.getList());

  $('#bangumiDiscoveryRails')?.addEventListener('click', event => {
    const cycle = event.target.closest('[data-resource-cycle]');
    const chip = event.target.closest('[data-resource-filter]');
    const year = event.target.closest('[data-resource-year]');
    if (cycle) {
      event.preventDefault();
      cycleDiscovery(cycle.dataset.resourceCycle, cycle);
      return;
    }
    if (chip) window.amoristBangumiDiscovery?.apply(chip.dataset.resourceFilter, chip.dataset.resourceValue);
    if (year) window.amoristBangumiDiscovery?.apply('era', year.dataset.resourceYear);
  });

  $('#bangumiDiscoveryFeature')?.addEventListener('click', event => {
    const feature = event.target.closest('[data-open-feature]');
    if (feature) window.amoristBangumiDiscovery?.show(feature.dataset.openFeature);
  });

  function chooseFeature(mode = 'any', open = false) {
    const game = window.amoristBangumiDiscovery?.random(mode, open);
    if (game && !open) renderFeature(game);
    if (!game) $('#bangumiDbManage')?.click();
  }
  $$('[data-resource-action="random"]').forEach(button => button.addEventListener('click', () => runWhenBangumiReady(() => chooseFeature('any', false))));
  $$('[data-resource-action="old"]').forEach(button => button.addEventListener('click', () => runWhenBangumiReady(() => chooseFeature('old', false))));

  function runWhenBangumiReady(action) {
    if (window.amoristBangumiDiscovery?.getList().length) { action(); return; }
    const once = event => {
      window.removeEventListener('amorist-bangumi-cache-ready', once);
      if ((event.detail?.list || []).length) action();
      else $('#bangumiDbManage')?.click();
    };
    window.addEventListener('amorist-bangumi-cache-ready', once);
  }

  /* Improve empty states without inserting fake data into a user's archive. */
  const improveEmptyStates = () => {
    const library = $('#gameLibraryGrid .empty-library');
    if (library && !library.querySelector('button')) {
      library.insertAdjacentHTML('beforeend','<div style="margin-top:16px"><button class="product-button rose" type="button" onclick="window.amoristProductNavigate(\'bangumi\',true)">去作品索引发现作品</button></div>');
    }
    const timeline = $('#timelineContent .timeline-empty');
    if (timeline && !timeline.querySelector('button')) {
      timeline.insertAdjacentHTML('beforeend','<div style="margin-top:16px"><button class="product-button secondary" type="button" onclick="window.amoristProductNavigate(\'library\',true)">先整理我的游戏档案</button></div>');
    }
  };
  const observer = new MutationObserver(improveEmptyStates);
  ['#gameLibraryGrid','#timelineContent'].forEach(selector => { const node=$(selector); if(node) observer.observe(node,{childList:true,subtree:true}); });
  improveEmptyStates();
})();
;
