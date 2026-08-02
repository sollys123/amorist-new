(() => {
  'use strict';

  const GAME_CATEGORIES = [
    { id:'hall_of_fame', label:'殿堂入り', legacy:['殿堂入り','最推し'] },
    { id:'love', label:'大好き', legacy:['大好き','好印象'] },
    { id:'like', label:'好き', legacy:['好き'] },
    { id:'normal', label:'普通', legacy:['普通'] },
    { id:'difficult', label:'苦手', legacy:['苦手'] },
    { id:'unclassified', label:'未分類', legacy:['未分類','未分类',''] }
  ];
  const CHARACTER_PREFERENCES = [
    { id:'favorite', label:'最推し', legacy:['最推し','最推','本命'] },
    { id:'oshi', label:'推し', legacy:['推し','推'] },
    { id:'like', label:'好き', legacy:['好き','喜欢'] },
    { id:'good', label:'好感', legacy:['好感'] },
    { id:'curious', label:'気になる', legacy:['気になる','気になる人'] },
    { id:'normal', label:'普通', legacy:['普通','ふつう'] },
    { id:'difficult', label:'苦手', legacy:['苦手','微妙'] },
    { id:'excluded', label:'対象外', legacy:['対象外','興味なし'] },
    { id:'unclassified', label:'未分類', legacy:['未分類','未分类','一般',''] }
  ];
  const CHARACTER_ROLE_TYPES = [
    { id:'protagonist', label:'主人公', legacy:['主人公','女主角','女主','ヒロイン','heroine'] },
    { id:'route', label:'攻略対象', legacy:['攻略対象','攻略对象','攻略角色','可攻略','男主角','target','route'] },
    { id:'sub', label:'サブキャラ', legacy:['サブキャラ','配角','脇役','support','side','sub'] },
    { id:'unset', label:'未設定', legacy:['未設定','未设定','未分类','未分類','unset',''] }
  ];

  const makeMaps = definitions => {
    const byId = new Map(definitions.map(item => [item.id, item]));
    const aliases = new Map();
    definitions.forEach(item => {
      [item.id, item.label, ...(item.legacy || [])].forEach(value => aliases.set(String(value ?? '').normalize('NFKC').trim().toLowerCase(), item.id));
    });
    return { byId, aliases };
  };
  const gameMaps = makeMaps(GAME_CATEGORIES);
  const preferenceMaps = makeMaps(CHARACTER_PREFERENCES);
  const roleMaps = makeMaps(CHARACTER_ROLE_TYPES);
  const normalizeWith = (value, maps, fallback) => maps.aliases.get(String(value ?? '').normalize('NFKC').trim().toLowerCase()) || fallback;
  const labelWith = (value, maps, fallback) => maps.byId.get(normalizeWith(value, maps, fallback))?.label || maps.byId.get(fallback)?.label || '';

  const normalizeGameCategory = value => normalizeWith(value, gameMaps, 'unclassified');
  const gameCategoryLabel = value => labelWith(value, gameMaps, 'unclassified');
  const normalizeCharacterPreference = value => normalizeWith(value, preferenceMaps, 'unclassified');
  const characterPreferenceLabel = value => labelWith(value, preferenceMaps, 'unclassified');
  const normalizeCharacterRoleType = value => normalizeWith(value, roleMaps, 'unset');
  const characterRoleTypeLabel = value => labelWith(value, roleMaps, 'unset');
  const defaultCharacterPreferenceForRole = roleType => String(roleType ?? '').trim().toLowerCase() === 'sub' ? 'excluded' : 'unclassified';

  function roleTypeFromBangumiRelation(value) {
    const relation = String(value ?? '').normalize('NFKC').trim().toLowerCase();
    if (!relation) return 'unset';
    if (relation === '主角' || relation === '主役' || relation === 'main') return 'route';
    if (relation === '配角' || relation === '脇役' || relation === 'support' || relation === 'side') return 'sub';
    return 'unset';
  }

  const characterSourceIds = character => new Set([
    character?.bangumiSubjectId,
    ...(Array.isArray(character?.bangumiSubjectIds) ? character.bangumiSubjectIds : [])
  ].filter(Boolean).map(String));
  const characterGameIds = character => new Set([
    character?.gameId,
    ...(Array.isArray(character?.gameIds) ? character.gameIds : [])
  ].filter(Boolean).map(String));

  function findBangumiRelation(character, gameRows = []) {
    const characterId = String(character?.bangumiCharacterId || character?.characterId || '').trim();
    if (!characterId) return '';
    const subjectIds = characterSourceIds(character);
    const gameIds = characterGameIds(character);
    const rows = Array.isArray(gameRows) ? gameRows : [];
    const candidates = rows.filter(game => {
      if (gameIds.has(String(game?.id || ''))) return true;
      const staticSubjectId = typeof game?.id === 'number' ? game.id : '';
      const subjectId = String(game?.bangumiId || game?.bangumiDisplayId || staticSubjectId || '');
      return subjectId && subjectIds.has(subjectId);
    });
    const findInRows = searchRows => {
      for (const game of searchRows) {
        const source = Array.isArray(game?.sourceCharacters) ? game.sourceCharacters : (Array.isArray(game?.chars) ? game.chars : []);
        const match = source.find(item => String(item?.id || item?.bangumiCharacterId || item?.character?.id || '') === characterId);
        if (match) return match.relation || match.role || match.role_name || match?.character?.relation || '';
      }
      return '';
    };
    const candidateRelation=findInRows(candidates);
    if(candidateRelation)return candidateRelation;
    if(candidates.length)return findInRows(rows.filter(game=>!candidates.includes(game)));
    return findInRows(rows);
  }

  function inferCharacterRoleType(character, gameRows = []) {
    const existing = normalizeCharacterRoleType(character?.roleType);
    if (character?.roleTypeSource === 'manual') return { roleType:existing, roleTypeSource:'manual' };
    if (character?.roleType && existing !== 'unset') return { roleType:existing, roleTypeSource:character?.roleTypeSource || 'bangumi' };
    const directRelation = character?.bangumiRelation || character?.sourceRelation || character?.bangumiRole || '';
    let mapped = roleTypeFromBangumiRelation(directRelation);
    if (mapped === 'unset') mapped = roleTypeFromBangumiRelation(findBangumiRelation(character, gameRows));
    return { roleType:mapped, roleTypeSource:character?.roleTypeSource || 'bangumi' };
  }

  function normalizeGameRecord(game) {
    if (!game || typeof game !== 'object') return game;
    return { ...game, category:normalizeGameCategory(game.category) };
  }

  function normalizeCharacterRecord(character, gameRows = []) {
    if (!character || typeof character !== 'object') return character;
    const legacyPreference = character.preference ?? character.relation ?? character.category;
    const role = inferCharacterRoleType(character, gameRows);
    const hasPreference = String(legacyPreference ?? '').normalize('NFKC').trim() !== '';
    const normalizedPreference = hasPreference ? normalizeCharacterPreference(legacyPreference) : defaultCharacterPreferenceForRole(role.roleType);
    const isUnclassifiedSubDefault = role.roleType === 'sub' && normalizedPreference === 'unclassified' && character.preferenceSource !== 'manual';
    return {
      ...character,
      preference:isUnclassifiedSubDefault ? 'excluded' : normalizedPreference,
      roleType:role.roleType,
      roleTypeSource:role.roleTypeSource
    };
  }

  function normalizeStorageEntry(key, raw) {
    let parsed;
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { return raw; }
    if (key === 'amorist-game-library-v1' && Array.isArray(parsed)) return JSON.stringify(parsed.map(normalizeGameRecord));
    if (key === 'amorist-character-book-v1' && Array.isArray(parsed)) return JSON.stringify(parsed.map(character => normalizeCharacterRecord(character, [])));
    return typeof raw === 'string' ? raw : JSON.stringify(raw);
  }

  window.AmoristDataModel = Object.freeze({
    GAME_CATEGORIES,
    CHARACTER_PREFERENCES,
    CHARACTER_ROLE_TYPES,
    normalizeGameCategory,
    gameCategoryLabel,
    normalizeCharacterPreference,
    characterPreferenceLabel,
    defaultCharacterPreferenceForRole,
    normalizeCharacterRoleType,
    characterRoleTypeLabel,
    roleTypeFromBangumiRelation,
    findBangumiRelation,
    inferCharacterRoleType,
    normalizeGameRecord,
    normalizeCharacterRecord,
    normalizeStorageEntry
  });
})();
