(() => {
'use strict';
// ---------- Utilitaires ----------
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => { const n = parseFloat(String(v ?? '').replace(/\s/g,'').replace(',','.')); return isFinite(n) ? n : 0; };
const nf0 = new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
const nf2 = new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const F = n => nf0.format(Math.round(n||0)) + ' FCFA';
const FK = n => nf0.format(Math.round(n||0)) + '<small>FCFA</small>';
const F2 = n => nf2.format(n||0) + ' FCFA';
const K = n => nf1.format(n||0) + ' kg';
const N = n => nf0.format(n||0);
const today = () => new Date().toISOString().slice(0,10);
const fdate = d => d ? d.split('-').reverse().join('/') : '';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

// ---------- Schémas ----------
// Feuille nécessaire : voir calcSac (simulateur de coût) et les marges réglables.
function estimePapier(v){
  const r = calcSac({L:v.largeur, H:v.longueur, S:v.cote, g:v.grammage}); if (!r) return null;
  return {w: r.fl, h: r.fh, g: r.poids};
}
// Les sacs se vendent par lots de 1 000. Prix interne = prix par sac.
// Ancienne saisie : un « prix par sac » de 1 000 FCFA ou plus est en fait un prix de lot.
const LOT = 1000;
const pvSac = p => !p ? 0 : num(p.prix_lot) ? num(p.prix_lot)/LOT : num(p.prix_vente) >= 1000 ? num(p.prix_vente)/LOT : num(p.prix_vente);
const pvLot = p => pvSac(p)*LOT;
const dims = r => num(r.longueur)&&num(r.largeur) ? `${nf1.format(num(r.longueur))} × ${nf1.format(num(r.largeur))}${num(r.cote)?' × '+nf1.format(num(r.cote)):''}` : '';
const ARTICLES = ['Graisse','Huile','Encre','Cartons','Scotch','Sopalin','Lingettes bébé','Lingettes imprimante','Encre imprimante numérique'];
const UNITES = ['pièce','kg','litre','bidon','carton','rouleau','paquet','boîte','pot'];
const CATS = {croissant:'Sac croissant', chawarma:'Sac chawarma', pain:'Sac à pain', shopping:'Sac shopping kraft', autre:'Autre'};
const SCHEMAS = {
  conteneurs: {
    title:'Conteneur de bobines kraft', plural:'Conteneurs kraft (Chine)',
    fields:[
      {k:'date',label:"Date d'arrivée",type:'date',req:1,def:today},
      {k:'reference',label:'N° conteneur / référence',type:'text',req:1},
      {k:'fournisseur',label:'Fournisseur (Chine)',type:'text'},
      {k:'nb_bobines',label:'Nombre de bobines',type:'number'},
      {k:'poids_kg',label:'Poids total du papier (kg)',type:'number',req:1,h:'Sert à calculer le coût du papier par kg'},
      {k:'grammage',label:'Grammage (g/m²)',type:'number'},
      {k:'devise',label:"Devise de l'achat",type:'select',options:[['FCFA','FCFA'],['USD','Dollar US'],['CNY','Yuan'],['EUR','Euro']],def:'USD'},
      {k:'prix_achat',label:'Prix des bobines (dans la devise)',type:'number',req:1},
      {k:'taux',label:'Taux de change (FCFA pour 1)',type:'number',h:'Ex. 1 USD = 610 FCFA. Laisser vide si FCFA',def:''},
      {k:'transport',label:'Transport maritime (FCFA)',type:'number'},
      {k:'douane',label:'Douane Côte d\'Ivoire (FCFA)',type:'number'},
      {k:'autres_frais',label:'Transit, manutention, camion (FCFA)',type:'number'},
      {k:'notes',label:'Notes',type:'textarea',full:1},
    ],
    calc: v => { const c = conteneurCout(v); return [
      ['Bobines en FCFA', F(c.achat)],['Transport', F(num(v.transport))],['Douane', F(num(v.douane))],['Autres frais', F(num(v.autres_frais))],
      ['Coût total rendu usine', F(c.total), 't'],['Coût par kg de papier', num(v.poids_kg) ? F2(c.total/num(v.poids_kg)) : '—', 't']]; },
    cols:[['date','Date',fdate],['reference','Conteneur'],['nb_bobines','Nb bobines',N,'num'],['poids_kg','Poids',K,'num'],
      [r=>conteneurCout(r).achat,'Bobines',F,'num'],[r=>num(r.transport),'Transport',F,'num'],[r=>num(r.douane),'Douane',F,'num'],
      [r=>conteneurCout(r).total,'Total',F,'num'],[r=>num(r.poids_kg)?conteneurCout(r).total/num(r.poids_kg):0,'Par kg',F2,'num']],
    sum:['Nb bobines','Poids','Bobines','Transport','Douane','Total'],
  },
  colle: {
    title:'Achat de colle', plural:'Colle (Abidjan)',
    fields:[
      {k:'date',label:"Date d'achat",type:'date',req:1,def:today},
      {k:'fournisseur',label:'Fournisseur',type:'text'},
      {k:'quantite_kg',label:'Quantité (kg)',type:'number',req:1},
      {k:'prix_total',label:'Prix total payé (FCFA)',type:'number',req:1},
      {k:'notes',label:'Notes',type:'textarea',full:1},
    ],
    calc: v => [['Prix par kg', num(v.quantite_kg) ? F2(num(v.prix_total)/num(v.quantite_kg)) : '—','t']],
    cols:[['date','Date',fdate],['fournisseur','Fournisseur'],['quantite_kg','Quantité',K,'num'],['prix_total','Prix total',F,'num'],[r=>num(r.quantite_kg)?num(r.prix_total)/num(r.quantite_kg):0,'Par kg',F2,'num']],
    sum:['Quantité','Prix total'],
  },
  productions: {
    title:'Production', plural:'Production',
    fields:[
      {k:'date',label:'Date',type:'date',req:1,def:today},
      {k:'produit',label:'Produit fabriqué',type:'product',req:1},
      {k:'quantite',label:'Nombre de sacs',type:'number',req:1},
      {k:'kraft_kg',label:'Papier kraft utilisé (kg)',type:'number',h:'Rempli automatiquement selon le produit, modifiable'},
      {k:'colle_kg',label:'Colle utilisée (kg)',type:'number',h:'Rempli automatiquement, modifiable'},
      {k:'notes',label:'Notes (machine, équipe, chutes…)',type:'textarea',full:1},
    ],
    auto: (v, changed) => {
      if (!['produit','quantite'].includes(changed)) return {};
      const p = prod(v.produit); if (!p) return {};
      const q = num(v.quantite);
      return {kraft_kg: +(q*num(p.g_papier)/1000).toFixed(2), colle_kg: +(q*num(p.g_colle)/1000).toFixed(3)};
    },
    calc: v => { const m = moyennes(); const c = num(v.kraft_kg)*m.kraft + num(v.colle_kg)*m.colle; const q = num(v.quantite);
      return [['Coût papier + colle', F(c)],['Par sac (matières seules)', q ? F2(c/q) : '—','t']]; },
    cols:[['date','Date',fdate],[r=>prodNom(r.produit),'Produit'],['quantite','Sacs',N,'num'],['kraft_kg','Papier',K,'num'],['colle_kg','Colle',K,'num'],['notes','Notes']],
    sum:['Sacs','Papier','Colle'],
  },
  ventes: {
    title:'Vente', plural:'Ventes',
    fields:[
      {k:'date',label:'Date',type:'date',req:1,def:today},
      {k:'client',label:'Client',type:'client',req:1},
      {k:'produit',label:'Produit',type:'product',req:1},
      {k:'lots',label:'Nombre de lots de 1 000',type:'number',h:'Remplit le nombre de sacs'},
      {k:'quantite',label:'Nombre de sacs',type:'number',req:1},
      {k:'prix_lot',label:'Prix du lot de 1 000 sacs (FCFA)',type:'number',req:1,h:'Proposé depuis le catalogue, modifiable'},
      {k:'montant_paye',label:'Montant déjà payé (FCFA)',type:'number',h:'Laisser vide si rien n\'est encore payé'},
      {k:'cliche',label:'Cliché utilisé (sacs imprimés)',type:'cliche',h:'Seulement pour les sacs avec impression personnalisée'},
      {k:'paiement',label:'Mode de paiement',type:'select',options:[['especes','Espèces'],['mobile','Mobile Money'],['virement','Virement'],['cheque','Chèque'],['credit','À crédit']],def:'especes'},
      {k:'notes',label:'Notes (n° facture, personnalisation…)',type:'textarea',full:1},
    ],
    auto: (v, changed) => { if (changed==='lots') return {quantite: Math.round(num(v.lots)*LOT)}; if (changed==='quantite') return {lots: +(num(v.quantite)/LOT).toFixed(3)}; if (changed==='prix_lot') return {prix_unitaire: num(v.prix_lot)/LOT};
      if (changed==='client' || changed==='produit') { const p = prod(v.produit); const out = changed==='produit' && p && pvSac(p) ? {prix_lot:pvLot(p), prix_unitaire:pvSac(p)} : {};
      if (!v.cliche && v.client) { const c = S.cliches.find(c => c.client===v.client && c.statut!=='archive' && (!c.produit || c.produit===v.produit)); if (c && (p?.cout_impression || p?.categorie==='shopping' || !p)) out.cliche = c.id; } return out; } return {}; },
    calc: v => { const t = num(v.quantite)*num(v.prix_unitaire); const cpu = coutUnitaire(v.produit);
      return [['Montant total', F(t),'t'],['Reste à payer', F(t-num(v.montant_paye))],
        ['Prix de revient estimé', cpu ? F(cpu*LOT)+' / lot de 1 000' : '—'],['Marge estimée', cpu ? F(t-cpu*num(v.quantite)) : '—']]; },
    cols:[['date','Date',fdate],[r=>clientNom(r.client),'Client'],[r=>prodNom(r.produit),'Produit'],['quantite','Sacs',N,'num'],[r=>num(r.prix_unitaire)*LOT,'Prix / lot',F,'num'],
      [r=>num(r.quantite)*num(r.prix_unitaire),'Total',F,'num'],[r=>{const d=num(r.quantite)*num(r.prix_unitaire)-num(r.montant_paye);return d>0.5?`<span class="pill warn">Reste ${F(d)}</span>`:'<span class="pill good">Payé</span>'},'Paiement',null,'html']],
    sum:['Sacs','Total'],
  },
  clients: {
    title:'Client', plural:'Clients',
    fields:[
      {k:'nom',label:'Nom du client',type:'text',req:1},
      {k:'type',label:'Type',type:'select',options:[['boulangerie','Boulangerie / pâtisserie'],['boutique','Boutique / supermarché'],['restaurant','Restaurant / fast-food'],['grossiste','Grossiste / revendeur'],['entreprise','Entreprise (sacs personnalisés)'],['autre','Autre']],def:'boulangerie'},
      {k:'telephone',label:'Téléphone',type:'text'},
      {k:'quartier',label:'Ville / quartier',type:'text'},
      {k:'notes',label:'Notes',type:'textarea',full:1},
    ],
    cols:[['nom','Client'],[r=>({boulangerie:'Boulangerie',boutique:'Boutique',restaurant:'Restaurant',grossiste:'Grossiste',entreprise:'Entreprise',autre:'Autre'})[r.type]||'','Type'],['telephone','Téléphone'],['quartier','Quartier'],
      [r=>clientStats(r.id).ca,'Achats',F,'num'],[r=>{const d=clientStats(r.id).du;return d>0.5?`<span class="pill warn">${F(d)}</span>`:'—'},'Doit',null,'html'],[r=>{const n=S.cliches.filter(c=>c.client===r.id).length;return n?`<span class="pill">${n} cliché${n>1?'s':''}</span>`:''},'Impression',null,'html']],
  },
  personnel: {
    title:'Paiement du personnel', plural:'Personnel',
    fields:[
      {k:'date',label:'Date du paiement',type:'date',req:1,def:today},
      {k:'nom',label:'Nom',type:'text',req:1},
      {k:'type',label:'Statut',type:'select',options:[['salarie','Salarié'],['interim','Intérimaire']],def:'salarie'},
      {k:'periode',label:'Période / jours travaillés',type:'text',h:'Ex. Novembre, ou 6 jours'},
      {k:'montant',label:'Montant payé (FCFA)',type:'number',req:1,h:'Salaire, prime, CNPS…'},
      {k:'notes',label:'Notes',type:'textarea',full:1},
    ],
    cols:[['date','Date',fdate],['nom','Nom'],[r=>r.type==='interim'?'<span class="pill">Intérimaire</span>':'<span class="pill good">Salarié</span>','Statut',null,'html'],['periode','Période'],['montant','Montant',F,'num']],
    sum:['Montant'],
  },
  electricite: {
    title:'Facture d\'électricité', plural:'Électricité',
    fields:[
      {k:'date',label:'Date de paiement',type:'date',req:1,def:today},
      {k:'debut',label:'Période du',type:'date',req:1,h:'Début de la période facturée'},
      {k:'fin',label:'au',type:'date',req:1,h:'Fin (souvent 2 mois)'},
      {k:'montant',label:'Montant (FCFA)',type:'number',req:1},
      {k:'kwh',label:'Consommation (kWh)',type:'number'},
      {k:'notes',label:'Notes',type:'textarea',full:1},
    ],
    calc: v => { const j = jours(v.debut, v.fin); return [['Durée', j ? j+' jours' : '—'],['Coût par mois (≈30 j)', j ? F(num(v.montant)/j*30) : '—','t']]; },
    cols:[['date','Payée le',fdate],[r=>fdate(r.debut)+' → '+fdate(r.fin),'Période'],['kwh','kWh',N,'num'],['montant','Montant',F,'num'],[r=>{const j=jours(r.debut,r.fin);return j?num(r.montant)/j*30:0},'Par mois',F,'num']],
    sum:['kWh','Montant'],
  },
  charges: {
    title:'Autre dépense', plural:'Autres dépenses',
    fields:[
      {k:'date',label:'Date',type:'date',req:1,def:today},
      {k:'categorie',label:'Catégorie',type:'select',options:[['loyer','Loyer'],['entretien','Entretien / pièces machine'],['livraison','Livraison / carburant'],['eau','Eau'],['admin','Impôts / administration'],['autre','Autre']],def:'autre'},
      {k:'libelle',label:'Description',type:'text',req:1},
      {k:'montant',label:'Montant (FCFA)',type:'number',req:1},
      {k:'notes',label:'Notes',type:'textarea',full:1},
    ],
    cols:[['date','Date',fdate],[r=>({loyer:'Loyer',entretien:'Entretien',livraison:'Livraison',cliche:'Clichés',encre:'Encre',emballage:'Emballage',eau:'Eau',admin:'Administration',autre:'Autre'})[r.categorie]||'','Catégorie'],['libelle','Description'],['montant','Montant',F,'num']],
    sum:['Montant'],
  },
  produits: {
    title:'Produit', plural:'Catalogue des produits',
    fields:[
      {k:'nom',label:'Nom du produit',type:'text',req:1,full:1},
      {k:'categorie',label:'Famille',type:'select',options:Object.entries(CATS),def:'croissant'},
      {k:'ordre',label:'Ordre d\'affichage',type:'number'},
      {k:'longueur',label:'Longueur / hauteur (cm)',type:'number'},
      {k:'largeur',label:'Largeur (cm)',type:'number'},
      {k:'cote',label:'Côté / soufflet (cm)',type:'number',h:'0 si sac plat sans soufflet'},
      {k:'grammage',label:'Grammage du papier (g/m²)',type:'number',h:'Ex. 40, 50, 70, 80'},
      {k:'g_papier',label:'Papier par sac (grammes)',type:'number',req:1,h:'Estimé depuis les dimensions. Plus précis : pesez 10 sacs et divisez par 10'},
      {k:'g_colle',label:'Colle par sac (grammes)',type:'number'},
      {k:'cout_impression',label:'Impression par sac (FCFA)',type:'number',h:'Encre, cliché… 0 si sans impression'},
      {k:'prix_lot',label:'Prix de vente du lot de 1 000 sacs (FCFA)',type:'number'},
      {k:'notes',label:'Notes (dimensions, grammage…)',type:'textarea',full:1},
    ],
    auto: (v, changed) => { if (!['longueur','largeur','cote','grammage'].includes(changed)) return {}; const e = estimePapier(v); const r = calcSac({L:v.largeur, H:v.longueur, S:v.cote, g:v.grammage}); return e ? {g_papier:+e.g.toFixed(1), g_colle:+(r.gL+r.gF).toFixed(2)} : {}; },
    calc: v => { const m = moyennes(); const e = estimePapier(v); const mat = num(v.g_papier)/1000*m.kraft + num(v.g_colle)/1000*m.colle + num(v.cout_impression);
      return [...(e?[['Feuille de papier par sac', `${nf1.format(e.w)} × ${nf1.format(e.h)} cm`],['Poids de papier estimé', nf1.format(e.g)+' g']]:[]),['Papier + colle + impression', F2(mat)],['Frais fixes par sac (moyenne)', F2(analyse(null,null).fixeParSac)],['Prix de revient estimé', F2(mat+analyse(null,null).fixeParSac),'t']]; },
    cols:[[r=>esc(r.nom)+(r.exemple?' <span class="pill warn">exemple</span>':''),'Produit',null,'html'],[r=>CATS[r.categorie]||'','Famille'],[r=>dims(r),'Dimensions (cm)'],[r=>num(r.grammage)?nf0.format(num(r.grammage))+' g/m²':'','Grammage'],['g_papier','Papier (g)',nf1.format.bind(nf1),'num'],['g_colle','Colle (g)',nf2.format.bind(nf2),'num'],['cout_impression','Impression',F2,'num'],[r=>coutUnitaire(r.id)*LOT,'Revient / lot',F,'num'],[r=>pvLot(r),'Vente / lot',F,'num']],
  },
};
SCHEMAS.fournitures = {
  title:'Achat de fourniture', plural:'Autres fournitures',
  fields:[
    {k:'date',label:"Date d'achat",type:'date',req:1,def:today},
    {k:'article',label:'Article',type:'article',req:1,h:'Choisissez dans la liste ou tapez un nouveau nom'},
    {k:'quantite',label:'Quantité',type:'number',req:1},
    {k:'unite',label:'Unité',type:'select',options:UNITES.map(u=>[u,u]),def:'pièce'},
    {k:'prix_total',label:'Prix total payé (FCFA)',type:'number',req:1},
    {k:'usage',label:'Utilisé pour',type:'select',options:[['general','Fabrication / atelier'],['numerique','Imprimante numérique']],def:'general',h:"« Imprimante numérique » : le coût est compté seulement sur les sacs imprimés"},
    {k:'fournisseur',label:'Fournisseur',type:'text'},
    {k:'notes',label:'Notes',type:'textarea',full:1},
  ],
  auto: (v, changed) => changed==='article' && /imprimante|num[ée]rique/i.test(v.article||'') ? {usage:'numerique'} : {},
  calc: v => [['Prix par '+(v.unite||'unité'), num(v.quantite) ? F2(num(v.prix_total)/num(v.quantite)) : '—','t']],
  cols:[['date','Date',fdate],['article','Article'],[r=>nf2.format(num(r.quantite))+' '+esc(r.unite||''),'Quantité',null,'html'],['prix_total','Prix total',F,'num'],[r=>num(r.quantite)?num(r.prix_total)/num(r.quantite):0,'Prix unitaire',F2,'num'],['fournisseur','Fournisseur']],
  sum:['Prix total'],
};
const STATUTS = [['stock','En stock'],['cours','En cours'],['finie','Terminée']];
SCHEMAS.bobines = {
  title:'Bobine', plural:'Bobines',
  fields:[
    {k:'numero',label:'N° de bobine',type:'text',req:1},
    {k:'conteneur',label:'Conteneur',type:'container'},
    {k:'produit',label:'Pour quel sac',type:'product',req:1,h:'Le format de sac que cette bobine sert à fabriquer'},
    {k:'poids_kg',label:'Poids de la bobine (kg)',type:'number',req:1,h:'Poids du papier, sans le mandrin'},
    {k:'grammage',label:'Grammage (g/m²)',type:'number',req:1},
    {k:'laize',label:'Laize / largeur de la bobine (cm)',type:'number'},
    {k:'statut',label:'Statut',type:'select',options:STATUTS,def:'stock'},
    {k:'date_debut',label:'Mise sur la machine le',type:'date'},
    {k:'date_fin',label:'Terminée le',type:'date'},
    {k:'sacs_reels',label:'Sacs réellement produits',type:'number',h:'À remplir quand la bobine est terminée'},
    {k:'notes',label:'Notes',type:'textarea',full:1},
  ],
  auto: (v, changed) => { if (changed!=='produit') return {}; const p = prod(v.produit); return p && num(p.grammage) && !num(v.grammage) ? {grammage:num(p.grammage)} : {}; },
  calc: v => { const e = bobineCalc(v); if (!e) return [['Sacs attendus','choisissez le sac, le poids et le grammage']];
    const out = [];
    if (e.metres) out.push(['Longueur de papier sur la bobine', nf0.format(e.metres)+' m']);
    if (e.coupe) out.push(['Longueur coupée par sac', nf1.format(e.coupe)+' cm']);
    out.push(['Sacs attendus', N(e.sacs)+' sacs','t']);
    if (e.cout) out.push(['Coût du papier de la bobine', F(e.cout)],['Coût papier par sac', F2(e.cout/e.sacs)]);
    if (num(v.sacs_reels)) out.push(['Rendement réel', nf0.format(num(v.sacs_reels)/e.sacs*100)+' % ('+N(num(v.sacs_reels)-e.sacs)+' sacs)','t']);
    if (e.alerte) out.push(['Attention', e.alerte]);
    return out; },
  cols:[['numero','Bobine'],[r=>prodNom(r.produit),'Pour le sac'],['poids_kg','Poids',K,'num'],['grammage','g/m²',N,'num'],['laize','Laize (cm)',nf1.format.bind(nf1),'num'],
    [r=>bobineCalc(r)?.sacs||0,'Sacs attendus',N,'num'],[r=>num(r.sacs_reels),'Sacs réels',v=>v?N(v):'','num'],
    [r=>{const e=bobineCalc(r); return e&&num(r.sacs_reels)?`<span class="pill ${num(r.sacs_reels)/e.sacs>=.95?'good':num(r.sacs_reels)/e.sacs>=.85?'warn':'bad'}">${nf0.format(num(r.sacs_reels)/e.sacs*100)} %</span>`:''},'Rendement',null,'html'],
    [r=>`<span class="pill ${r.statut==='finie'?'':r.statut==='cours'?'warn':'good'}">${(STATUTS.find(x=>x[0]===r.statut)||STATUTS[0])[1]}</span>`,'Statut',null,'html']],
  sum:['Poids','Sacs attendus','Sacs réels'],
};
// Sacs attendus d'une bobine : longueur déroulée ÷ longueur coupée par sac (si dimensions connues), sinon poids ÷ papier par sac
function bobineCalc(v){
  const p = prod(v.produit); const kg = num(v.poids_kg), gm = num(v.grammage) || num(p?.grammage), laize = num(v.laize);
  if (!p || !kg) return null;
  const e = estimePapier({...p, grammage: gm});
  let sacs = 0, metres = 0, coupe = 0, alerte = '';
  if (e && laize && gm) { metres = kg*1000/(gm*laize/100); coupe = e.h; sacs = Math.floor(metres*100/coupe);
    if (Math.abs(laize - e.w) > 1.5) alerte = `la laize (${nf1.format(laize)} cm) ne correspond pas à la feuille du sac (${nf1.format(e.w)} cm)`; }
  else if (e && gm) { sacs = Math.floor(kg*1000/e.g); }
  else if (num(p.g_papier)) { sacs = Math.floor(kg*1000/num(p.g_papier)); }
  sacs = Math.floor(sacs * (1 - marges().chutes/100));
  if (!sacs) return null;
  const c = S.conteneurs.find(x => x.id === v.conteneur); const pk = c && num(c.poids_kg) ? conteneurCout(c).total/num(c.poids_kg) : moyennes().kraft;
  return {sacs, metres, coupe, alerte, cout: kg*pk};
}
SCHEMAS.cliches = {
  title:"Cliché d'impression", plural:'Clichés',
  fields:[
    {k:'date',label:'Date de fabrication',type:'date',req:1,def:today},
    {k:'genre',label:'Type de cliché',type:'select',options:[['perso',"Personnalisé (logo d'un client)"],['standard','Standard (motif commun à tous les clients)']],def:'perso'},
    {k:'client',label:'Client (cliché personnalisé)',type:'client',h:'Laisser vide pour un cliché standard'},
    {k:'logo',label:'Logo / motif gravé',type:'text',req:1,h:'Ex. « Bon appétit », croissant, logo + téléphone…'},
    {k:'produit',label:'Pour quel sac',type:'product'},
    {k:'couleurs',label:'Nombre de couleurs',type:'number',def:1},
    {k:'cout',label:'Coût du cliché (FCFA)',type:'number',req:1,h:'Plaque plastique + gravure'},
    {k:'refacture',label:'Montant facturé au client pour le cliché (FCFA)',type:'number',h:'0 si offert'},
    {k:'statut',label:'État',type:'select',options:[['actif','En service'],['use','Usé / à refaire'],['archive','Rangé']],def:'actif'},
    {k:'notes',label:'Notes (emplacement, cylindre…)',type:'textarea',full:1},
  ],
  calc: v => { const n = v.id ? clicheSacs(v.id) : 0; return [['Reste à votre charge', F(num(v.cout)-num(v.refacture)),'t'],...(n?[['Sacs imprimés avec ce cliché', N(n)],['Coût du cliché par sac', F2((num(v.cout)-num(v.refacture))/n)]]:[])]; },
  cols:[['date','Date',fdate],[r=>r.genre==='standard'?'<span class="pill good">Standard</span>':esc(clientNom(r.client)),'Client',null,'html'],['logo','Logo'],[r=>r.produit?prodNom(r.produit):'','Sac'],['cout','Coût',F,'num'],['refacture','Facturé',v=>v?F(v):'','num'],
    [r=>clicheSacs(r.id),'Sacs imprimés',N,'num'],[r=>{const n=clicheSacs(r.id);return n?(num(r.cout)-num(r.refacture))/n:0},'Coût / sac',v=>v?F2(v):'','num'],
    [r=>({actif:'<span class="pill good">En service</span>',use:'<span class="pill warn">Usé</span>',archive:'<span class="pill">Rangé</span>'})[r.statut]||'','État',null,'html']],
  sum:['Coût','Facturé','Sacs imprimés'],
};
const clicheNom = c => c.genre==='standard' ? 'Standard' : clientNom(c.client);
const clicheSacs = id => S.ventes.filter(v => v.cliche === id).reduce((s,v)=>s+num(v.quantite),0);
SCHEMAS.numerique = {
  title:'Impression numérique', plural:'Impression numérique',
  fields:[
    {k:'date',label:'Date',type:'date',req:1,def:today},
    {k:'client',label:'Client',type:'client',req:1},
    {k:'produit',label:'Sac imprimé',type:'product',req:1,h:'Le sac déjà fabriqué que vous passez dans l’imprimante'},
    {k:'quantite',label:'Nombre de sacs imprimés',type:'number',req:1},
    {k:'rates',label:'Sacs ratés / gâchés',type:'number'},
    {k:'motif',label:'Motif imprimé',type:'text',h:'Ex. Logo + adresse, quadri'},
    {k:'supplement',label:"Prix de l'impression facturé par sac (FCFA)",type:'number',h:"Ce que le client paie en plus du sac pour l'impression"},
    {k:'notes',label:'Notes',type:'textarea',full:1},
  ],
  calc: v => { const c = numCoutSac(null,null); const q = num(v.quantite); return [['Coût moyen d’impression par sac', c ? F2(c) : 'ajoutez vos achats d’encre numérique'],
    ...(q&&c?[['Coût de cette impression', F(c*(q+num(v.rates)))]]:[]), ...(q&&num(v.supplement)?[['Facturé au client', F(q*num(v.supplement))],['Marge sur l’impression', F(q*num(v.supplement)-c*(q+num(v.rates))),'t']]:[])]; },
  cols:[['date','Date',fdate],[r=>clientNom(r.client),'Client'],[r=>prodNom(r.produit),'Sac'],['motif','Motif'],['quantite','Sacs imprimés',N,'num'],['rates','Ratés',v=>v?N(v):'','num'],['supplement','Prix / sac',v=>v?F2(v):'','num'],[r=>num(r.quantite)*num(r.supplement),'Facturé',F,'num']],
  sum:['Sacs imprimés','Ratés','Facturé'],
};
// coût d'impression numérique par sac = fournitures "imprimante numérique" ÷ sacs passés dans l'imprimante (période, sinon depuis le début)
function numCoutSac(a,b){
  const sum = (A,B) => { const c = S.fournitures.filter(r=>r.usage==='numerique' && inP(r.date,A,B)).reduce((s,r)=>s+num(r.prix_total),0);
    const n = S.numerique.filter(r=>inP(r.date,A,B)).reduce((s,r)=>s+num(r.quantite)+num(r.rates),0); return n ? c/n : 0; };
  return sum(a,b) || sum(null,null);
}
SCHEMAS.sorties = {
  title:'Utilisation de fourniture', plural:'Utilisation des fournitures',
  fields:[
    {k:'date',label:'Date',type:'date',req:1,def:today},
    {k:'article',label:'Article utilisé',type:'article',req:1},
    {k:'quantite',label:'Quantité sortie du magasin',type:'number',req:1,h:"Dans la même unité qu'à l'achat"},
    {k:'notes',label:'Notes (machine, commande…)',type:'textarea',full:1},
  ],
  calc: v => { const f = fourniture(v.article); return f ? [['En stock avant cette sortie', nf2.format(f.reste + (form&&form.id?num(S.sorties.find(x=>x.id===form.id)?.quantite):0))+' '+f.unite],['Valeur de cette sortie', F(num(v.quantite)*f.pu),'t']] : [['Article','pas encore acheté']]; },
  cols:[['date','Date',fdate],['article','Article'],[r=>nf2.format(num(r.quantite))+' '+esc(fourniture(r.article)?.unite||''),'Quantité',null,'html'],['notes','Notes']],
};
SCHEMAS.estimations = {
  title:'Estimation', plural:'Estimations',
  fields:[
    {k:'date',label:'Date',type:'date',req:1,def:today},
    {k:'type',label:'Type',type:'select',options:[['PRV','Prévisionnel (production prévue)'],['DEV','Devis client'],['SIM','Simulation (essai, nouveau format)']],def:'PRV'},
    {k:'reference',label:'Référence',type:'text',req:1,h:'Type-année mois-numéro, ex. PRV-2611-01'},
    {k:'nom',label:'Nom',type:'text',req:1,full:1},
    {k:'client',label:'Client (pour un devis)',type:'client'},
    {k:'quantite',label:'Quantité prévue (sacs)',type:'number'},
    {k:'notes',label:'Notes',type:'textarea',full:1},
  ],
  auto: (v, changed) => changed==='type' && /^(PRV|DEV|SIM)-\d{4}-\d+$/.test(v.reference||'') ? {reference: nextRef(v.type)} : {},
  calc: v => v.res ? [['Sacs par tonne', N(v.res.net)],["Papier par sac", nf1.format(v.res.poids)+' g'],['Colle par sac', nf2.format(num(v.res.gL)+num(v.res.gF))+' g · '+F2(v.res.colle)],['Coût de fabrication par sac', F2(v.res.total)],['Coût du lot de 1 000', F(num(v.res.total)*LOT),'t']].concat(num(v.res.pv)?[['Prix du lot', F(num(v.res.pv)*LOT)]]:[], num(v.res.conseille)?[['Lot conseillé', F(num(v.res.conseille)*LOT)]]:[]).concat(num(v.quantite)?[['Coût pour '+N(num(v.quantite))+' sacs', F(num(v.quantite)*num(v.res.total))]]:[]) : [],
  cols:[['date','Date',fdate],['reference','Référence'],[r=>(TYPES_EST.find(t=>t[0]===r.type)||['',''])[1],'Type'],['nom','Nom'],[r=>r.client?clientNom(r.client):'','Client'],[r=>num(r.quantite),'Quantité',v=>v?N(v):'','num'],
    [r=>num(r.res?.net),'Sacs / tonne',v=>v?N(v):'','num'],[r=>num(r.res?.total)*LOT,'Coût / lot',v=>v?F(v):'','num'],
    [r=>r.cx?`<button class="btn small" data-act="cx-load" data-id="${esc(r.id)}">Ouvrir</button>`:'','',null,'html']],
};
const COLS = Object.keys(SCHEMAS).concat(['parametres']);

// ---------- Données ----------
const S = {}; COLS.forEach(c => S[c] = []);
let demo = false, realS = null;
// ---------- Données (Supabase en ligne, ou mode local si non configuré) ----------
let sb = null, mode = 'loading', user = null, membre = null, equipe = [], chan = null;
const LS = 'ecosac-gestion-v1';
const downloads = { async save({filename, data}){
  const type = /\.csv$/.test(filename) ? 'text/csv;charset=utf-8' : 'application/json';
  const url = URL.createObjectURL(new Blob([data], {type})); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
} };
function lsLoad(){ try { const d = JSON.parse(localStorage.getItem(LS)||'{}'); COLS.forEach(c => S[c] = Array.isArray(d[c]) ? d[c] : []); } catch(e){} }
function lsSave(){ try { localStorage.setItem(LS, JSON.stringify(S)); } catch(e){ toast("Impossible d'enregistrer sur cet appareil"); } }
const store = () => demo ? realS : S;
function put(T, col, rec){ if (!T[col]) return; const i = T[col].findIndex(r => r.id === rec.id); if (i>=0) T[col][i] = rec; else T[col].push(rec); }
function prep(rec){ const id = rec.id || uid(); const body = {...rec}; delete body.id; body.maj = new Date().toISOString(); return {id, body}; }
async function save(col, rec){
  const {id, body} = prep(rec);
  if (demo) { put(S, col, {id,...body}); render(); return id; }
  if (mode === 'db') {
    const { error } = await sb.from('records').upsert({collection:col, id, data:body});
    if (error) { netErr(error); throw error; }
    put(S, col, {id,...body}); soon();
  } else { put(S, col, {id,...body}); lsSave(); render(); }
  return id;
}
// Enregistrement groupé (catalogue, restauration) : une requête par lot de 300 lignes.
async function saveMany(items){
  if (demo || mode !== 'db') { for (const [c, r] of items) await save(c, r); return; }
  const rows = items.map(([c, r]) => { const {id, body} = prep(r); return {collection:c, id, data:body}; });
  for (let i = 0; i < rows.length; i += 300) {
    const { error } = await sb.from('records').upsert(rows.slice(i, i+300)); if (error) { netErr(error); throw error; }
  }
  rows.forEach(r => put(S, r.collection, {id:r.id, ...r.data})); soon();
}
async function remove(col, id){
  if (demo) { S[col] = S[col].filter(r => r.id !== id); render(); return; }
  if (mode === 'db') {
    const { error } = await sb.from('records').delete().match({collection:col, id}); if (error) { netErr(error); throw error; }
    S[col] = S[col].filter(r => r.id !== id); soon();
  } else { S[col] = S[col].filter(r => r.id !== id); lsSave(); render(); }
}
function netErr(e){ console.warn(e); if (/fetch|network/i.test(e.message||'')) setStatus('loc','Pas de connexion internet'); else if (e.code === '42501') toast("Votre compte n'a pas le droit d'enregistrer"); }
let rTimer = null; function soon(){ clearTimeout(rTimer); rTimer = setTimeout(render, 30); }

async function boot(){
  const C = window.ECOSAC_CONFIG || {};
  if (!C.supabaseUrl || !C.supabaseKey || !window.supabase) {
    mode = 'local'; lsLoad(); setStatus('loc','Mode local : enregistré sur cet appareil seulement'); render(); return;
  }
  sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') return showAuth('nouveau');
    if (ev === 'SIGNED_OUT') { user = null; membre = null; equipe = []; if (chan) { sb.removeChannel(chan); chan = null; } mode = 'loading'; COLS.forEach(c => S[c] = []); document.body.classList.remove('menu'); drawUser(); render(); showAuth('login'); }
    if (ev === 'SIGNED_IN' && session && (!user || user.id !== session.user.id || !membre)) setTimeout(() => enter(session.user), 0);
  });
  const { data } = await sb.auth.getSession();
  if (data.session) await enter(data.session.user); else showAuth('login');
}
let entering = null;
function enter(u){ if (entering && user && user.id === u.id) return entering; entering = enter2(u).finally(() => { entering = null; }); return entering; }
async function enter2(u){
  user = u;
  let { data:m, error } = await sb.from('membres').select('*').eq('user_id', u.id).maybeSingle();
  if (error) { console.warn(error); showAuth('login', errText(error)); return; }
  if (!m) { // Personne n'est encore administrateur : le premier compte connecté le devient.
    const r = await sb.rpc('reclamer_admin'); if (!r.error && r.data === true) ({ data:m } = await sb.from('membres').select('*').eq('user_id', u.id).maybeSingle());
  }
  if (!m) { showAuth('attente'); return; }
  membre = m; hideAuth(); mode = 'db'; setStatus('loc','Chargement de vos données…'); drawUser();
  try { await loadAll(); } catch(e){ setStatus('loc','Erreur de chargement, actualisez la page'); }
  subscribe(); loadEquipe(); render();
}
async function loadAll(){
  const T = {}; COLS.forEach(c => T[c] = []);
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('records').select('collection,id,data').order('collection').order('id').range(from, from+999);
    if (error) throw error;
    data.forEach(r => { if (T[r.collection]) T[r.collection].push({id:r.id, ...r.data}); });
    if (data.length < 1000) break;
  }
  const D = store(); COLS.forEach(c => D[c] = T[c]);
  setStatus('ok','Données enregistrées en ligne'); soon();
}
function subscribe(){
  if (chan) sb.removeChannel(chan);
  chan = sb.channel('records-ecosac').on('postgres_changes', {event:'*', schema:'public', table:'records'}, p => {
    const T = store();
    if (p.eventType === 'DELETE') { const o = p.old || {}; if (T[o.collection]) T[o.collection] = T[o.collection].filter(r => r.id !== o.id); }
    else { const n = p.new; put(T, n.collection, {id:n.id, ...n.data}); }
    soon();
  }).subscribe(st => {
    if (st === 'SUBSCRIBED') setStatus('ok','Données enregistrées en ligne');
    if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('loc','Connexion instable, nouvelle tentative…');
  });
}
// Après une coupure internet ou un téléphone en veille : on recharge pour ne rien manquer.
let lastSync = Date.now();
function resync(){ if (mode !== 'db' || Date.now() - lastSync < 15000) return; lastSync = Date.now(); loadAll().catch(()=>{}); }
addEventListener('online', () => { lastSync = 0; resync(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) resync(); });
function setStatus(k, t){ $('#status').innerHTML = `<span class="dot ${k}"></span><span>${esc(t)}</span>`; }

// ---------- Comptes et équipe ----------
function drawUser(){
  const el = $('#who'); if (!el) return;
  if (mode !== 'db' || !user) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span class="who-n">${esc(membre?.nom || user.email)}</span><span class="who-r">${membre?.role==='admin'?'Administrateur':'Saisie'}</span><button data-act="logout">Se déconnecter</button>`;
}
async function loadEquipe(){
  if (!membre || membre.role !== 'admin') { equipe = []; return; }
  const { data } = await sb.from('membres').select('*').order('cree_le'); equipe = data || []; soon();
}
function vEquipe(){
  if (mode !== 'db' || !membre) return '';
  if (membre.role !== 'admin') return `<div class="panel" style="grid-column:1/-1"><h3>Mon compte</h3><p class="note">Connecté en tant que <b>${esc(user.email)}</b>. Seul l'administrateur peut ajouter des personnes.</p></div>`;
  return `<div class="panel" style="grid-column:1/-1"><h3>Équipe</h3><p class="note">La personne crée d'abord son compte sur l'écran de connexion. Ajoutez ensuite son adresse e-mail ici pour lui donner accès.</p>
    <div class="tw" style="margin:10px 0"><table><thead><tr><th>Personne</th><th>Rôle</th><th></th></tr></thead><tbody>
    ${equipe.map(m => `<tr><td>${esc(m.nom||m.email)}<div class="note">${esc(m.email||'')}</div></td><td>${m.role==='admin'?'Administrateur':'Saisie'}</td><td class="actions">${m.user_id===user.id?'<span class="pill">Vous</span>':`<button class="btn small danger" data-act="retirer" data-uid="${esc(m.user_id)}">Retirer</button>`}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="fields"><div class="field"><label for="eq_mail">Adresse e-mail</label><input id="eq_mail" type="email" autocomplete="off" placeholder="nom@exemple.com"></div>
    <div class="field"><label for="eq_role">Rôle</label><select id="eq_role"><option value="saisie">Saisie (achats, production, ventes)</option><option value="admin">Administrateur (gère aussi l'équipe)</option></select></div></div>
    <div class="sheetbar"><button class="btn" data-act="ajouter-membre">Donner accès</button></div></div>`;
}
async function ajouterMembre(){
  const mail = $('#eq_mail').value.trim(), role = $('#eq_role').value; if (!mail) return toast("Saisissez l'adresse e-mail");
  const { data, error } = await sb.rpc('ajouter_membre', {p_email:mail, p_role:role});
  if (error) return toast("L'ajout a échoué");
  if (data === 'inconnu') return toast("Aucun compte avec cette adresse. La personne doit d'abord créer son compte.");
  toast('Accès donné'); loadEquipe();
}
async function retirerMembre(id){
  const { error } = await sb.from('membres').delete().eq('user_id', id);
  if (error) return toast('Le retrait a échoué'); toast('Accès retiré'); loadEquipe();
}

// ---------- Écran de connexion ----------
let authKind = 'login';
function showAuth(kind, msg){
  authKind = kind; const el = $('#auth'); el.hidden = false; document.body.classList.add('locked');
  const T = {
    login:   ['Connexion', 'Accédez à la gestion de votre usine.'],
    signup:  ['Créer un compte', "Après la création, l'administrateur doit vous donner accès."],
    oubli:   ['Mot de passe oublié', 'Recevez un lien par e-mail pour choisir un nouveau mot de passe.'],
    nouveau: ['Nouveau mot de passe', 'Choisissez votre nouveau mot de passe.'],
    attente: ['Accès en attente', ''],
  }[kind];
  let body = '';
  if (kind === 'attente') body = `<p class="note">Votre compte <b>${esc(user?.email||'')}</b> est créé. Demandez à l'administrateur d'ECOSAC de vous donner accès dans « Produits &amp; prix », section Équipe. Revenez ensuite sur cette page.</p>
    <div class="auth-actions"><button type="button" class="btn primary" data-act="recheck">J'ai reçu l'accès</button><button type="button" class="btn" data-act="logout">Changer de compte</button></div>`;
  else body = `<form id="authf" novalidate>
    ${kind==='signup'?'<div class="field"><label for="a_nom">Nom</label><input id="a_nom" autocomplete="name" required></div>':''}
    ${kind!=='nouveau'?'<div class="field"><label for="a_mail">Adresse e-mail</label><input id="a_mail" type="email" autocomplete="email" required></div>':''}
    ${kind!=='oubli'?`<div class="field"><label for="a_pass">Mot de passe</label><input id="a_pass" type="password" minlength="8" autocomplete="${kind==='login'?'current-password':'new-password'}" required>${kind!=='login'?'<small class="h">8 caractères minimum</small>':''}</div>`:''}
    <p class="auth-msg" id="a_msg" role="alert">${esc(msg||'')}</p>
    <button class="btn primary big" type="submit">${{login:'Se connecter',signup:'Créer mon compte',oubli:'Envoyer le lien',nouveau:'Enregistrer'}[kind]}</button>
    </form>
    <div class="auth-links">${kind==='login'?'<button type="button" data-act="auth" data-k="signup">Créer un compte</button><button type="button" data-act="auth" data-k="oubli">Mot de passe oublié ?</button>':'<button type="button" data-act="auth" data-k="login">Retour à la connexion</button>'}</div>`;
  el.innerHTML = `<div class="auth-card"><div class="brand"><div class="logo">${ico('bag')}</div><div><b>ECOSAC</b><small>Sacs en papier kraft</small></div></div>
    <h2>${T[0]}</h2>${T[1]?`<p class="lead">${T[1]}</p>`:''}${body}</div>`;
  const f = el.querySelector('input'); if (f) setTimeout(() => f.focus(), 50);
}
function hideAuth(){ const el = $('#auth'); el.hidden = true; el.innerHTML = ''; document.body.classList.remove('locked'); }
// Traduit les erreurs Supabase en phrases claires.
function errText(e){
  const m = String(e && (e.message || e.msg || e.error_description) || e || ''), c = e && (e.code || e.error_code) || '';
  if (/délai/.test(m)) return m;
  if (/not confirmed|email_not_confirmed/i.test(m+c)) return "Votre adresse n'est pas encore confirmée. Ouvrez le lien reçu par e-mail (regardez aussi dans les spams), puis reconnectez-vous.";
  if (/invalid login|invalid_credentials/i.test(m+c)) return "E-mail ou mot de passe incorrect. Pas encore de compte ? Cliquez sur « Créer un compte » ci-dessous.";
  if (/already registered|already exists|user_already_exists/i.test(m+c)) return 'Un compte existe déjà avec cette adresse. Cliquez sur « Retour à la connexion ».';
  if (/rate limit|too many|over_email_send_rate/i.test(m+c)) return "Trop d'essais en peu de temps. Attendez quelques minutes puis réessayez.";
  if (/password/i.test(m) && /6|8|short|weak/i.test(m)) return 'Mot de passe trop court ou trop simple. Utilisez au moins 8 caractères.';
  if (/valid email|invalid.*email|email_address_invalid/i.test(m+c)) return "L'adresse e-mail n'est pas valide.";
  if (/fetch|network|load failed/i.test(m)) return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  if (/PGRST205|42P01|schema cache/i.test(m+c)) return "La base de données n'est pas encore installée : exécutez le fichier schema.sql dans Supabase (SQL Editor).";
  return 'Erreur : ' + (m || 'inconnue');
}
const delai = (pr, ms=20000) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error("Le serveur ne répond pas (délai dépassé). Vérifiez votre connexion internet et réessayez.")), ms))]);
function authMsg(t, ok){ const el = $('#a_msg'); if (!el) return; el.textContent = t || ''; el.classList.toggle('ok', !!ok); }
async function authSubmit(){
  const v = id => ($('#'+id)?.value || '').trim(); const msg = authMsg;
  const btn = $('#authf button[type=submit]'); const label = btn.textContent;
  if (authKind !== 'nouveau' && !v('a_mail')) return msg('Saisissez votre adresse e-mail.');
  if ((authKind === 'login' || authKind === 'signup' || authKind === 'nouveau') && !$('#a_pass').value) return msg('Saisissez votre mot de passe.');
  if ((authKind === 'signup' || authKind === 'nouveau') && $('#a_pass').value.length < 8) return msg('Le mot de passe doit faire au moins 8 caractères.');
  btn.disabled = true; btn.textContent = 'Un instant…'; msg('');
  try {
    if (authKind === 'login') {
      const { data, error } = await delai(sb.auth.signInWithPassword({email:v('a_mail'), password:$('#a_pass').value}));
      if (error) msg(errText(error));
      else if (data && data.user) await enter(data.user);
    } else if (authKind === 'signup') {
      const { data, error } = await delai(sb.auth.signUp({email:v('a_mail'), password:$('#a_pass').value, options:{data:{nom:v('a_nom')}, emailRedirectTo:location.origin+location.pathname}}));
      if (error) msg(errText(error));
      else if (data.session) await enter(data.session.user);
      else { const mail = v('a_mail'); showAuth('login'); $('#a_mail').value = mail; authMsg('Compte créé. Ouvrez le lien de confirmation reçu par e-mail (regardez aussi dans les spams), puis connectez-vous ici.', true); }
    } else if (authKind === 'oubli') {
      const { error } = await delai(sb.auth.resetPasswordForEmail(v('a_mail'), {redirectTo:location.origin+location.pathname}));
      if (error) msg(errText(error)); else msg('Lien envoyé. Regardez votre boîte e-mail.', true);
    } else if (authKind === 'nouveau') {
      const { error } = await delai(sb.auth.updateUser({password:$('#a_pass').value}));
      if (error) msg(errText(error)); else { const { data } = await sb.auth.getSession(); if (data.session) await enter(data.session.user); }
    }
  } catch(e){ console.warn(e); msg(errText(e)); }
  finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = label; } }
}

// ---------- Calculs ----------
const prod = id => S.produits.find(p => p.id === id);
const prodNom = id => prod(id)?.nom || '(produit supprimé)';
const clientNom = id => S.clients.find(c => c.id === id)?.nom || '(client supprimé)';
const sortedProds = () => [...S.produits].sort((a,b) => (num(a.ordre)-num(b.ordre)) || String(a.nom).localeCompare(b.nom,'fr'));
function conteneurCout(v){
  const achat = v.devise && v.devise !== 'FCFA' ? num(v.prix_achat)*num(v.taux) : num(v.prix_achat);
  return {achat, total: achat + num(v.transport) + num(v.douane) + num(v.autres_frais)};
}
function jours(a,b){ if(!a||!b) return 0; const d = (new Date(b) - new Date(a))/864e5 + 1; return d>0 ? Math.round(d) : 0; }
function moyennes(){
  let kc=0,kk=0,cc=0,ck=0;
  S.conteneurs.forEach(c => { kc += conteneurCout(c).total; kk += num(c.poids_kg); });
  S.colle.forEach(c => { cc += num(c.prix_total); ck += num(c.quantite_kg); });
  return {kraft: kk ? kc/kk : 0, colle: ck ? cc/ck : 0, kraftKg:kk, colleKg:ck, kraftCout:kc, colleCout:cc};
}
const inP = (d, a, b) => (!a || d >= a) && (!b || d <= b);
// part d'une facture (période debut→fin) qui tombe dans [a,b]
function prorata(r, a, b){
  const m = num(r.montant); if (!r.debut || !r.fin) return inP(r.date,a,b) ? m : 0;
  const tot = jours(r.debut, r.fin); if (!tot) return inP(r.date,a,b) ? m : 0;
  const s = !a || r.debut > a ? r.debut : a, e = !b || r.fin < b ? r.fin : b;
  return jours(s,e) ? m * jours(s,e) / tot : 0;
}
const cache = new Map();
function analyse(a, b){
  const key = (a||'')+'|'+(b||'')+'|'+stamp; if (cache.has(key)) return cache.get(key);
  const m = moyennes();
  const personnel = S.personnel.filter(r => inP(r.date,a,b)).reduce((s,r) => s+num(r.montant), 0);
  const elec = S.electricite.reduce((s,r) => s+prorata(r,a,b), 0);
  const autres = S.charges.filter(r => inP(r.date,a,b)).reduce((s,r) => s+num(r.montant), 0);
  const fourn = S.fournitures.filter(r => inP(r.date,a,b) && r.usage!=='numerique').reduce((s,r) => s+num(r.prix_total), 0);
  const numJobs = S.numerique.filter(r => inP(r.date,a,b)); const numSacs = numJobs.reduce((s,r)=>s+num(r.quantite),0), numRates = numJobs.reduce((s,r)=>s+num(r.rates),0);
  const numCout = S.fournitures.filter(r => inP(r.date,a,b) && r.usage==='numerique').reduce((s,r) => s+num(r.prix_total), 0);
  const numFact = numJobs.reduce((s,r)=>s+num(r.quantite)*num(r.supplement),0);
  const clich = S.cliches.filter(r => inP(r.date,a,b)).reduce((s,r) => s+num(r.cout)-num(r.refacture), 0);
  const fixes = personnel + elec + autres + fourn + clich;
  const P = {}; let sacs = 0, kraftUse = 0, colleUse = 0;
  S.productions.filter(r => inP(r.date,a,b)).forEach(r => {
    const p = P[r.produit] ||= {q:0,k:0,c:0,vq:0,ca:0}; p.q += num(r.quantite); p.k += num(r.kraft_kg); p.c += num(r.colle_kg);
    sacs += num(r.quantite); kraftUse += num(r.kraft_kg); colleUse += num(r.colle_kg);
  });
  let ca = 0, encaisse = 0, vSacs = 0;
  S.ventes.filter(r => inP(r.date,a,b)).forEach(r => {
    const p = P[r.produit] ||= {q:0,k:0,c:0,vq:0,ca:0}; const t = num(r.quantite)*num(r.prix_unitaire);
    p.vq += num(r.quantite); p.ca += t; ca += t; vSacs += num(r.quantite); encaisse += Math.min(num(r.montant_paye), t);
  });
  const fixeParSac = sacs ? fixes/sacs : 0;
  const res = {m, personnel, elec, autres, fourn, clich, numSacs, numRates, numCout, numFact, fixes, P, sacs, kraftUse, colleUse, ca, encaisse, vSacs, fixeParSac,
    achatsKraft: S.conteneurs.filter(r => inP(r.date,a,b)).reduce((s,r)=>s+conteneurCout(r).total,0),
    achatsColle: S.colle.filter(r => inP(r.date,a,b)).reduce((s,r)=>s+num(r.prix_total),0)};
  cache.set(key, res); return res;
}
// détail du prix de revient d'un produit sur une période
function detailCout(pid, A){
  const p = prod(pid); const d = A.P[pid];
  const kgSac = d && d.q && d.k ? d.k/d.q : num(p?.g_papier)/1000;
  const cSac = d && d.q && d.c ? d.c/d.q : num(p?.g_colle)/1000;
  const papier = kgSac*A.m.kraft, colle = cSac*A.m.colle, impr = num(p?.cout_impression);
  let fixe = A.fixeParSac; if (!fixe) fixe = analyse(null,null).fixeParSac;
  return {papier, colle, impr, fixe, total: papier+colle+impr+fixe, kgSac};
}
const coutUnitaire = pid => pid && prod(pid) ? detailCout(pid, analyse(null,null)).total : 0;
function clientStats(id){
  let ca=0, du=0; S.ventes.filter(v => v.client === id).forEach(v => { const t = num(v.quantite)*num(v.prix_unitaire); ca += t; du += t - num(v.montant_paye); });
  return {ca, du};
}
function fournituresStock(){
  const M = {};
  const key = n => String(n||'').trim().toLowerCase();
  S.fournitures.forEach(r => { const k = key(r.article); if (!k) return; const f = M[k] ||= {nom:String(r.article).trim(), achete:0, cout:0, utilise:0, unite:r.unite||'', dernier:''};
    f.achete += num(r.quantite); f.cout += num(r.prix_total); if (String(r.date) >= f.dernier) { f.dernier = r.date; f.unite = r.unite||f.unite; } });
  S.sorties.forEach(r => { const k = key(r.article); const f = M[k] ||= {nom:String(r.article).trim(), achete:0, cout:0, utilise:0, unite:'', dernier:''}; f.utilise += num(r.quantite); });
  return Object.values(M).map(f => ({...f, reste:f.achete-f.utilise, pu: f.achete ? f.cout/f.achete : 0, valeur:(f.achete-f.utilise)*(f.achete ? f.cout/f.achete : 0)})).sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));
}
const fourniture = n => fournituresStock().find(f => f.nom.toLowerCase() === String(n||'').trim().toLowerCase());
function stock(){
  const m = moyennes(); let ku=0, cu=0; S.productions.forEach(r => { ku += num(r.kraft_kg); cu += num(r.colle_kg); });
  const finis = sortedProds().map(p => {
    const fab = S.productions.filter(r => r.produit===p.id).reduce((s,r)=>s+num(r.quantite),0);
    const ven = S.ventes.filter(r => r.produit===p.id).reduce((s,r)=>s+num(r.quantite),0);
    return {p, fab, ven, reste: fab-ven, valeur: (fab-ven)*coutUnitaire(p.id)};
  });
  return {kraft: m.kraftKg-ku, colle: m.colleKg-cu, kraftVal:(m.kraftKg-ku)*m.kraft, colleVal:(m.colleKg-cu)*m.colle, ku, cu, m, finis};
}
const config = () => S.parametres.find(p => p.id === 'config') || {};
let stamp = 0;

// ---------- Périodes ----------
function periode(k){
  const d = new Date(), y = d.getFullYear(), mo = d.getMonth();
  const iso = x => new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())).toISOString().slice(0,10);
  if (k==='mois') return [iso(new Date(y,mo,1)), iso(new Date(y,mo+1,0))];
  if (k==='prec') return [iso(new Date(y,mo-1,1)), iso(new Date(y,mo,0))];
  if (k==='3m') return [iso(new Date(y,mo-2,1)), iso(new Date(y,mo+1,0))];
  if (k==='annee') return [y+'-01-01', y+'-12-31'];
  return [null,null];
}
const PERIODES = [['mois','Ce mois'],['prec','Mois dernier'],['3m','3 derniers mois'],['annee','Cette année'],['tout','Depuis le début']];

// ---------- Calculatrice : sacs par tonne, colle et coût de fabrication ----------
// Feuille : largeur = 2 × largeur du sac + 2 × soufflet + collage latéral ; longueur = hauteur + coef × soufflet + rabat.
// Colle (estimation) : latérale = longueur du joint (longueur de feuille) × g par mètre ; fond = (largeur + soufflet) × g par mètre.
const MARGES_DEF = {collage:3, rabat:3, coef:0.75, chutes:4, cible:30, gl:0.6, gf:1.0, plp:177000, plk:150, pfp:55000, pfk:25};
function marges(){ const c = config(); const r = {}; for (const k in MARGES_DEF) r[k] = c['m_'+k] !== undefined && c['m_'+k] !== '' ? num(c['m_'+k]) : MARGES_DEF[k]; return r; }
function calcSac(x){
  const L = num(x.L), H = num(x.H), Sf = num(x.S), g = num(x.g), m = {...MARGES_DEF, ...(x.m || marges())};
  if (!L || !H || !g) return null;
  const fl = 2*L + 2*Sf + num(m.collage), fh = H + (Sf ? num(m.coef)*Sf : 0) + num(m.rabat);
  const surf = fl*fh/10000, poids = surf*g, brut = 1e6/poids, ch = Math.min(num(m.chutes), 90)/100, net = brut*(1 - ch);
  const gL = fh/100*num(m.gl), gF = (L + Sf)/100*num(m.gf);
  const pkL = num(m.plk) ? num(m.plp)/num(m.plk) : 0, pkF = num(m.pfk) ? num(m.pfp)/num(m.pfk) : 0;
  return {fl, fh, surf, poids, brut, net, kgMille: poids/(1 - ch), gL, gF, pkL, pkF, colleCout: gL/1000*pkL + gF/1000*pkF};
}
// Coût complet d'un sac à partir d'un état de calculatrice
function coutSac(x, r){
  const pk = x.pk !== '' && x.pk != null ? num(x.pk) : moyennes().kraft;
  const papier = r.kgMille/1000*pk, colle = r.colleCout, impr = num(x.impr);
  // Cliché : standard = déjà payé (0) ; nouveau personnalisé = (coût − part facturée) réparti sur la quantité
  const qte = num(x.cmd), clicheTot = x.clich==='new' ? Math.max(0, num(x.clc) - num(x.clr)) : 0, cliche = clicheTot && qte ? clicheTot/qte : 0;
  const frais = x.frais ? fraisSac() : 0;
  return {pk, papier, colle, impr, frais, cliche, clicheTot, total: papier + colle + impr + frais + cliche};
}
function fraisSac(){ const [a,b] = (()=>{ const d = new Date(); const e = d.toISOString().slice(0,10); d.setMonth(d.getMonth()-3); return [d.toISOString().slice(0,10), e]; })(); return analyse(a,b).fixeParSac; }
// Prix de vente : saisi dans la calculatrice, sinon celui du sac choisi dans le catalogue.
const pvDe = x => x.pvl !== '' && x.pvl != null ? num(x.pvl)/LOT : pvSac(prod(x.prod));
// Prix conseillé : coût ÷ (1 − marge cible), arrondi au FCFA (au 5 FCFA au-dessus de 100).
// renvoie le prix conseillé par sac, calé sur un prix de lot arrondi aux 50 FCFA au-dessus
function prixConseille(cout, cible){ if (!cout || cible >= 100) return 0; return Math.ceil(cout*LOT/(1 - cible/100)/50)*50/LOT; }
function margeHtml(pv, cout, fmt){ fmt = fmt || F2; if (!pv || !cout) return ''; const mg = pv - cout, pc = mg/pv*100;
  return `<b class="${mg>=0?'good-t':'bad-t'}">${mg>=0?'Bénéfice':'Perte'} ${mg>=0?'':'−'}${fmt(Math.abs(mg))} (${mg>=0?'':'−'}${nf0.format(Math.abs(pc))} %)</b>`; }
const TYPES_EST = [['PRV','Prévisionnel'],['DEV','Devis client'],['SIM','Simulation']];
function nextRef(type){
  const d = new Date(), p = `${type}-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}-`;
  const n = S.estimations.filter(e => String(e.reference||'').startsWith(p)).map(e => +String(e.reference).slice(p.length)||0);
  return p + String((n.length ? Math.max(...n) : 0) + 1).padStart(2,'0');
}
const CX_DEF = {prod:'', L:'', H:'', S:'', g:80, bob:'', cmd:'', pk:'', impr:'', pvl:'', frais:false, clich:'', clc:'', clr:''};
let CX = {...CX_DEF}, CXm = null, CXopen = false;
document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('marges')) CXopen = e.target.open; }, true);
try { const s = JSON.parse(localStorage.getItem(LS+'-calc')||'null'); if (s) { delete s.pv; CX = {...CX, ...s}; } } catch(e){}
function vCalcul(){
  const m = CXm || marges(); const mk = moyennes().kraft;
  const opts = S.produits.filter(p=>num(p.largeur)&&num(p.longueur)).map(p=>`<option value="${esc(p.id)}" ${CX.prod===p.id?'selected':''}>${esc(p.nom)} · ${dims(p)}</option>`).join('');
  const inp = (k, l, h, ph) => `<div class="field"><label for="cx_${k}">${l}</label><input id="cx_${k}" data-cx="${k}" type="number" inputmode="decimal" step="any" min="0" value="${esc(CX[k]??'')}" ${ph?`placeholder="${esc(ph)}"`:''}>${h?`<small class="h">${h}</small>`:''}</div>`;
  const minp = (k, l, h) => `<div class="field"><label for="cm_${k}">${l}</label><input id="cm_${k}" data-cm="${k}" type="number" inputmode="decimal" step="any" min="0" value="${esc(m[k])}">${h?`<small class="h">${h}</small>`:''}</div>`;
  const rows = S.produits.map(p => { const x = {L:p.largeur, H:p.longueur, S:p.cote, g:p.grammage, m, pk:CX.pk, impr:p.cout_impression, frais:CX.frais}; const r = calcSac(x); return {p, r, c: r && coutSac(x, r)}; }).filter(x=>x.r);
  return `<div class="head"><div><h2>Simulateur de coût</h2><p class="lead">Sacs par tonne, papier et colle consommés, et coût de fabrication d'un sac. Les résultats se mettent à jour pendant la saisie. Enregistrez un calcul pour le retrouver plus tard.</p></div></div>
  <div class="grid calc-grid">
    <div class="panel"><h3>Le sac</h3>
      <div class="fields flat">
        <div class="field full"><label for="cx_prod">Partir d'un sac du catalogue</label><select id="cx_prod" data-cx="prod"><option value="">Saisie libre</option>${opts}</select></div>
        ${inp('L','Largeur L (cm)','Face avant du sac')}${inp('H','Hauteur H (cm)')}
        ${inp('S','Soufflet S (cm)','0 pour un sac plat')}${inp('g','Grammage (g/m²)')}
        ${inp('cmd','Quantité à produire (sacs)','Facultatif')}${inp('bob','Poids d\'une bobine (kg)','Facultatif')}
      </div>
      <h3 style="margin-top:22px">Coûts</h3>
      <div class="fields flat">
        ${inp('pk','Prix du papier (FCFA/kg)', mk ? `Vide = moyenne de vos conteneurs (${F(mk)}/kg)` : 'Ou saisissez vos conteneurs dans Achats', mk ? Math.round(mk) : '')}
        ${inp('impr','Encre / impression par sac (FCFA)','0 si sans impression')}
        <div class="field"><label for="cx_clich">Cliché</label><select id="cx_clich" data-cx="clich"><option value="" ${!CX.clich?'selected':''}>Aucun (sans impression)</option><option value="std" ${CX.clich==='std'?'selected':''}>Cliché standard (déjà payé)</option><option value="new" ${CX.clich==='new'?'selected':''}>Nouveau cliché personnalisé</option></select><small class="h">${S.cliches.some(c=>c.genre==='standard'&&c.statut!=='archive')?'Standards : '+esc(S.cliches.filter(c=>c.genre==='standard'&&c.statut!=='archive').map(c=>c.logo).join(', ')):'Un cliché standard ne coûte rien de plus'}</small></div>
        ${CX.clich==='new'?inp('clc','Coût du cliché (FCFA)','Plaque + gravure')+inp('clr','Part facturée au client (FCFA)','0 si offert'):''}
        ${inp('pvl','Prix de vente du lot de 1 000 (FCFA)', pvSac(prod(CX.prod)) ? `Vide = prix du catalogue (${F(pvLot(prod(CX.prod)))})` : 'Facultatif, pour voir la marge', pvSac(prod(CX.prod)) ? pvLot(prod(CX.prod)) : '')}
        <div class="field"><label class="check"><input type="checkbox" data-cx="frais" ${CX.frais?'checked':''}> Ajouter les frais généraux</label><small class="h">Personnel, électricité, fournitures… par sac, moyenne des 3 derniers mois</small></div>
      </div>
      <details class="marges" ${CXm||CXopen?'open':''}><summary>Marges et colle <span class="note" id="cm_sum">${margesTxt(m)}</span></summary>
        <div class="fields flat">${minp('collage','Collage latéral (cm)','Ajouté à la largeur de la feuille')}${minp('rabat','Rabat (cm)','Ajouté à la longueur de la feuille')}${minp('coef','Coefficient du fond','Part du soufflet repliée au fond (0,75)')}${minp('chutes','Taux de chutes (%)','Papier perdu : réglages, ratés, fins de bobine')}${minp('cible','Marge cible (%)','Pour le prix de vente conseillé')}</div>
        <div class="subh">Colle latérale</div>
        <div class="fields flat three">${minp('gl','Grammes par mètre de joint','Estimation à ajuster')}${minp('plp','Prix du lot (FCFA)')}${minp('plk','Poids du lot (kg)')}</div>
        <div class="subh">Colle de fond</div>
        <div class="fields flat three">${minp('gf','Grammes par mètre de fond','Estimation à ajuster')}${minp('pfp','Prix du lot (FCFA)')}${minp('pfk','Poids du lot (kg)')}</div>
        <div class="sheetbar"><button class="btn" data-act="marges-save">Enregistrer comme valeurs par défaut</button><button class="btn" data-act="marges-reset">Valeurs d'origine</button></div>
        <p class="note">La consommation de colle est une estimation. Pour l'ajuster : pesez la colle utilisée sur une production, divisez par le nombre de sacs, et corrigez les grammes par mètre. Les marges enregistrées servent aussi au calcul des bobines et des produits.</p>
      </details>
    </div>
    <div id="cx_out">${calcOut()}</div>
  </div>
  <div class="head" style="margin:32px 0 14px"><div><h3 style="margin:0">Estimations enregistrées</h3><p class="lead">Référence : <b>PRV</b> prévisionnel (production prévue), <b>DEV</b> devis client, <b>SIM</b> simulation (nouveau format, essai), puis l'année et le mois, puis un numéro. Exemple : PRV-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth()+1).padStart(2,'0')}-01.</p></div></div>
  ${listBlock('estimations')}
  ${rows.length?`<h3 style="margin:28px 0 4px">Votre catalogue</h3><p class="note" style="margin:0 0 12px">Coût avec le prix du papier${CX.frais?', les frais généraux':''} et l'impression de chaque sac. Prix par lot de 1 000 sacs. Lot conseillé pour ${nf0.format(m.cible)} % de marge.</p><div class="tw"><table><thead><tr><th>Sac</th><th>Format</th><th class="num">Papier + colle</th><th class="num">Sacs / tonne</th><th class="num">Coût / lot</th><th class="num">Prix / lot</th><th class="num">Résultat / lot</th><th class="num">Lot conseillé</th></tr></thead><tbody>
    ${rows.map(({p,r,c})=>`<tr><td style="white-space:normal;min-width:140px">${esc(p.nom)}</td><td style="white-space:nowrap">${dims(p)} · ${N(p.grammage)} g</td><td class="num" style="white-space:nowrap">${nf1.format(r.poids)} + ${nf1.format(r.gL+r.gF)} g</td><td class="num"><b>${N(Math.floor(r.net))}</b></td><td class="num">${c.pk?F(c.total*LOT):'—'}</td><td class="num">${pvSac(p)?F(pvLot(p)):'—'}</td><td class="num" style="white-space:nowrap">${c.pk?margeHtml(pvLot(p), c.total*LOT, F).replace(/Bénéfice |Perte /,''):''}</td><td class="num">${c.pk?F(prixConseille(c.total, num(m.cible))*LOT):'—'}</td></tr>`).join('')}
  </tbody></table></div>`:''}`;
}
const margesTxt = m => `marge cible ${nf0.format(m.cible)} % · collage ${nf1.format(m.collage)} cm · rabat ${nf1.format(m.rabat)} cm · fond ${nf2.format(m.coef)} × S · chutes ${nf1.format(m.chutes)} % · colle ${nf1.format(m.gl)} et ${nf1.format(m.gf)} g/m`;
function calcOut(){
  const m = CXm || marges(); const r = calcSac({...CX, m});
  if (!r) return `<div class="panel"><div class="empty"><b>Saisissez la largeur, la hauteur et le grammage</b>ou choisissez un sac du catalogue.</div></div>`;
  const c = coutSac(CX, r), bob = num(CX.bob), cmd = num(CX.cmd), pv = pvDe(CX), pc = prixConseille(c.pk ? c.total : 0, num(m.cible));
  const line = (l, v, cls) => `<div class="${cls||''}"><span>${l}</span><span>${v}</span></div>`;
  const marge = pv ? pv - c.total : null, ok = !!c.pk;
  return `<div class="grid kpis cx-kpis">
      ${kpi('Sacs par tonne', N(Math.floor(r.net)), `après ${nf1.format(m.chutes)} % de chutes · ${N(Math.floor(r.brut))} sans chutes`, 'hero')}
      ${kpi('Coût du lot de 1 000', ok ? F(c.total*LOT) : '—', ok ? `soit ${F2(c.total)} par sac` : 'Indiquez le prix du papier')}
      ${kpi(marge!==null && ok ? (marge>=0?'Bénéfice par lot':'Perte par lot') : 'Marge par lot', marge!==null && ok ? `<span class="${marge>=0?'good-t':'bad-t'}">${marge>=0?'':'−'}${F(Math.abs(marge*LOT))}</span>` : '—', marge!==null && ok ? `${nf0.format(marge/pv*100)} % du prix du lot (${F(pv*LOT)})${CX.pvl===''||CX.pvl==null?' · catalogue':''} · ${marge>=0?'':'−'}${F2(Math.abs(marge))} par sac` : 'Choisissez un sac du catalogue ou saisissez un prix de lot', marge!==null && ok && marge<0 ? 'loss' : '')}
      ${kpi('Prix du lot conseillé', pc ? F(pc*LOT) : '—', pc ? `pour ${nf0.format(m.cible)} % de marge · ${F2(pc)} par sac${pv?` · ${pc>pv?'+'+F(Math.round((pc-pv)*LOT))+' par rapport à votre prix':pc<pv?'votre prix est au-dessus':'votre prix est juste'}`:''}` : 'Indiquez le prix du papier')}
    </div>
    <div class="panel" style="margin-top:16px"><h3>Papier</h3><div class="calc cx-detail">
      ${line('Largeur de feuille', `2 × ${nf1.format(num(CX.L))} + 2 × ${nf1.format(num(CX.S))} + ${nf1.format(m.collage)} = <b>${nf1.format(r.fl)} cm</b>`)}
      ${line('Longueur de feuille', `${nf1.format(num(CX.H))} + ${nf2.format(m.coef)} × ${nf1.format(num(CX.S))} + ${nf1.format(m.rabat)} = <b>${nf1.format(r.fh)} cm</b>`)}
      ${line('Surface', `${nf1.format(r.fl)} × ${nf1.format(r.fh)} ÷ 10 000 = ${nf2.format(r.surf)} m²`)}
      ${line("Poids d'un sac", `${nf2.format(r.surf)} × ${N(CX.g)} g/m² = <b>${nf1.format(r.poids)} g</b>`)}
      ${line('Sacs par tonne', `1 000 000 ÷ ${nf1.format(r.poids)} = ${N(Math.floor(r.brut))}`)}
      ${line(`Moins ${nf1.format(m.chutes)} % de chutes`, N(Math.floor(r.net)), 't')}
      ${line('Papier pour 1 000 sacs', nf1.format(r.kgMille)+' kg')}
      ${bob?line(`Sacs par bobine de ${N(bob)} kg`, N(Math.floor(r.net*bob/1000))):''}
      ${bob?line('Laize conseillée', nf1.format(r.fl)+' cm'):''}
    </div></div>
    <div class="panel" style="margin-top:16px"><h3>Colle <span class="pill warn">estimation</span></h3><div class="calc cx-detail">
      ${line('Colle latérale', `${nf2.format(r.fh/100)} m × ${nf1.format(m.gl)} g/m = <b>${nf2.format(r.gL)} g</b>`)}
      ${line('Colle de fond', `${nf2.format((num(CX.L)+num(CX.S))/100)} m × ${nf1.format(m.gf)} g/m = <b>${nf2.format(r.gF)} g</b>`)}
      ${line('Prix au kg', `latérale ${F(r.pkL)} · fond ${F(r.pkF)}`)}
      ${line('Coût de la colle par sac', F2(r.colleCout), 't')}
      ${line('Colle pour 1 000 sacs', `${nf2.format(r.gL)} kg latérale + ${nf2.format(r.gF)} kg fond`)}
    </div></div>
    <div class="panel" style="margin-top:16px"><h3>Coût de fabrication d'un sac</h3><div class="calc cx-detail">
      ${line('Papier (chutes comprises)', c.pk ? `${nf1.format(r.kgMille)} g × ${F(c.pk)}/kg = ${F2(c.papier)}` : '<span class="note">prix du papier manquant</span>')}
      ${line('Colle latérale + fond', F2(c.colle))}
      ${c.impr?line('Encre / impression', F2(c.impr)):''}
      ${CX.clich==='std'?line('Cliché standard', 'déjà payé, 0 FCFA'):''}
      ${CX.clich==='new'?line('Cliché personnalisé', c.clicheTot ? (num(CX.cmd) ? `${F(c.clicheTot)} ÷ ${N(num(CX.cmd))} sacs = ${F2(c.cliche)}` : '<span class="note">indiquez la quantité à produire pour le répartir</span>') : 'payé par le client'):''}
      ${CX.frais?line('Frais généraux', c.frais ? F2(c.frais) : '<span class="note">pas encore de production saisie</span>'):''}
      ${line('Total par sac', F2(c.total), 't')}
      ${line('Coût du lot de 1 000 sacs', `<b>${F(c.total*LOT)}</b>`)}
      ${pv?line('Prix du lot'+(CX.pvl===''||CX.pvl==null?' (catalogue)':''), `${F(pv*LOT)} <span class="note">(${F2(pv)} par sac)</span>`, 't'):''}
      ${pv&&ok?line('Résultat par lot', margeHtml(pv*LOT, c.total*LOT, F)):''}
      ${pv&&ok?line('Résultat par sac', margeHtml(pv, c.total)):''}
      ${pc?line(`Prix du lot conseillé (marge ${nf0.format(m.cible)} %)`, `${F(c.total*LOT)} ÷ (1 − ${nf0.format(m.cible)} %) ≈ <b>${F(pc*LOT)}</b>`):''}
      ${cmd?line(`Pour ${N(cmd)} sacs`, `${nf1.format(cmd*r.kgMille/1000)} kg de papier · ${nf1.format(cmd*r.gL/1000)} kg colle latérale · ${nf1.format(cmd*r.gF/1000)} kg colle de fond`, 't'):''}
      ${cmd?line('Coût total de la quantité', `<b>${F(cmd*c.total)}</b>${pv?` · vente ${F(cmd*pv)} · ${marge>=0?'bénéfice':'perte'} ${F(Math.abs(cmd*marge))}`:''}`):''}
    </div>
    <div class="sheetbar" style="padding:14px 0 0;border:0;background:none"><button class="btn primary" data-act="cx-save">${ico('plus')}Enregistrer cette estimation</button><button class="btn" data-act="cx-new">Nouveau calcul</button></div></div>`;
}
function onCalcInput(e){
  const t = e.target;
  if (t.dataset.cx === 'prod') { CX.prod = t.value; const p = prod(t.value); if (p) { CX.L = num(p.largeur)||''; CX.H = num(p.longueur)||''; CX.S = num(p.cote)||0; if (num(p.grammage)) CX.g = num(p.grammage); CX.impr = num(p.cout_impression)||''; } CX.pvl = ''; render(); }
  else if (t.dataset.cx === 'frais') CX.frais = t.checked;
  else if (t.dataset.cx === 'clich') { CX.clich = t.value; try { localStorage.setItem(LS+'-calc', JSON.stringify(CX)); } catch(_){} render(); return; }
  else if (t.dataset.cx) { CX[t.dataset.cx] = t.value; if (['L','H','S','g'].includes(t.dataset.cx) && CX.prod) { CX.prod = ''; const s = $('#cx_prod'); if (s) s.value = ''; } }
  else if (t.dataset.cm) { CXm = {...(CXm || marges()), [t.dataset.cm]: t.value === '' ? 0 : num(t.value)}; const sm = $('#cm_sum'); if (sm) sm.textContent = margesTxt(CXm); }
  try { localStorage.setItem(LS+'-calc', JSON.stringify(CX)); } catch(_){}
  const o = $('#cx_out'); if (o) o.innerHTML = calcOut();
}
async function margesSave(reset){
  const m = reset ? MARGES_DEF : (CXm || marges()); const body = {...config(), id:'config'}; for (const k in MARGES_DEF) body['m_'+k] = num(m[k]);
  try { await save('parametres', body); CXm = null; toast(reset ? "Valeurs d'origine rétablies" : 'Valeurs enregistrées'); render(); } catch(e){ toast("Échec de l'enregistrement"); }
}
function cxSave(){
  const m = CXm || marges(); const r = calcSac({...CX, m}); if (!r) return toast("Saisissez d'abord la largeur, la hauteur et le grammage");
  const c = coutSac(CX, r); const p = prod(CX.prod);
  const nom = `${p ? p.nom : 'Sac'} ${nf1.format(num(CX.L))}×${nf1.format(num(CX.H))}${num(CX.S)?'×'+nf1.format(num(CX.S)):''} · ${N(CX.g)} g${num(CX.cmd)?' · '+N(num(CX.cmd))+' sacs':''}`;
  openForm('estimations', null, {type:'PRV', reference:nextRef('PRV'), nom, quantite: num(CX.cmd)||'', produit: CX.prod||'',
    cx:{...CX}, m:{...m}, res:{poids:+r.poids.toFixed(2), net:Math.floor(r.net), gL:+r.gL.toFixed(3), gF:+r.gF.toFixed(3), colle:+c.colle.toFixed(3), papier:+c.papier.toFixed(3), total:+c.total.toFixed(3), pv:pvDe(CX), conseille:prixConseille(c.pk?c.total:0, num(m.cible))}});
}
function cxLoad(id){
  const e = S.estimations.find(x => x.id === id); if (!e || !e.cx) return;
  CX = {...CX_DEF, ...e.cx}; const base = marges(); CXm = e.m && Object.keys(MARGES_DEF).some(k => num(e.m[k]) !== num(base[k])) ? {...base, ...e.m} : null;
  try { localStorage.setItem(LS+'-calc', JSON.stringify(CX)); } catch(_){}
  tab = 'calcul'; try { history.replaceState(null,'','#calcul'); } catch(_){} render(); scrollTo({top:0, behavior:'smooth'}); toast(`${e.reference} chargée dans le simulateur`);
}

// ---------- Navigation ----------
const TABS = [['tableau','Tableau de bord'],['achats','Achats matière'],['production','Production'],['ventes','Ventes'],['clients','Clients'],['charges','Charges'],['stock','Stock'],['calcul','Simulateur de coût'],['produits','Produits & prix']];
let tab = 'tableau', per = 'mois', sub = {achats:'conteneurs', charges:'personnel', production:'productions'};
try { const t = (location.hash||'').slice(1); if (TABS.some(x=>x[0]===t)) tab = t; const p = localStorage.getItem(LS+'-per'); if (p) per = p; } catch(e){}
const IC = {
  bag:'<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  grid:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  factory:'<path d="M3 21V10l6 4V10l6 4V6l6-3v18H3z"/><path d="M7 17h2M12 17h2M17 17h1"/>',
  cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6.2"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  truck:'<path d="M2 6h11v10H2z"/><path d="M13 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  boxes:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  wallet:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M6 6l9-3 1 3"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', roll:'<ellipse cx="7" cy="12" rx="4" ry="8"/><path d="M7 4h10c2.2 0 4 3.6 4 8s-1.8 8-4 8H7"/><circle cx="7" cy="12" r="1.5"/>',
  drop:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>', bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', print:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  stamp:'<path d="M9 3h6l-1 8h-4z"/><path d="M4 15h16v3H4zM6 21h12"/>', person:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h1M12 11h0M15.5 11h.5M8 14.5h1M12 14.5h0M15.5 14.5v3M8 18h1M12 18h0"/>',
  box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>', out:'<path d="M14 4h6v16h-6"/><path d="M3 12h11M7 8l-4 4 4 4"/>'
};
const ico = (n, cls) => `<svg class="${cls||'ico'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;
function paintIcons(root){ (root||document).querySelectorAll('[data-ic]').forEach(el => { if (!el.querySelector('svg')) el.insertAdjacentHTML('afterbegin', ico(el.dataset.ic, el.classList.contains('logo')?'':'ico')); }); }
const NAV = [['Pilotage',[['tableau','Tableau de bord','grid']]],['Activité',[['production','Production','factory'],['ventes','Ventes','cart'],['clients','Clients','users']]],['Matière & stock',[['achats','Achats matière','truck'],['stock','Stock','boxes'],['calcul','Simulateur de coût','calc']]],['Gestion',[['charges','Charges','wallet'],['produits','Produits & prix','tag']]]];
function drawTabs(){
  const du = S.ventes.filter(v => num(v.quantite)*num(v.prix_unitaire)-num(v.montant_paye) > 0.5).length;
  $('#nav').innerHTML = NAV.map(([g,items]) => `<div class="nav-group">${g}</div>${items.map(([k,l,i]) => `<a href="#${k}" data-tab="${k}" ${k===tab?'aria-current="page"':''}>${ico(i)}<span>${l}</span>${k==='clients'&&du?`<span class="cnt" title="Ventes non payées">${du}</span>`:''}</a>`).join('')}`).join('');
  $('#bottom').innerHTML = [['tableau','Accueil','grid'],['production','Production','factory'],['ventes','Ventes','cart'],['stock','Stock','boxes']].map(([k,l,i]) => `<a href="#${k}" data-tab="${k}" ${k===tab?'aria-current="page"':''}>${ico(i)}<span>${l}</span></a>`).join('') + `<button data-act="menu" ${['achats','clients','charges','produits','calcul'].includes(tab)?'aria-current="page"':''}>${ico('menu')}<span>Plus</span></button>`;
  const db = $('#demoBtn'); if (db) db.textContent = demo ? "Quitter l'exemple" : 'Voir un exemple rempli';
  const g = NAV.find(([,it])=>it.some(x=>x[0]===tab)); const cur = g && g[1].find(x=>x[0]===tab);
  $('#crumb').innerHTML = g ? `<span>${g[0]}</span><i>/</i><b>${cur[1]}</b>${demo?' <span class="pill warn">Exemple</span>':''}` : '';
}
const QUICK = [
  ['Au quotidien',[['productions','Production du jour','factory','Sacs fabriqués, papier et colle'],['ventes','Vente','cart','Client, sacs, paiement'],['numerique','Impression numérique','print','Sacs imprimés après fabrication'],['sorties','Sortie de fourniture','out','Graisse, encre, cartons utilisés…']]],
  ['Achats',[['conteneurs','Conteneur kraft','truck','Bobines, transport, douane'],['bobines','Bobine','roll','Poids, laize, sac prévu'],['colle','Achat de colle','drop','Quantité et prix'],['fournitures','Fourniture','box','Graisse, huile, encre, scotch…'],['cliches','Cliché','stamp','Plaque gravée pour un client']]],
  ['Charges & clients',[['personnel','Paiement du personnel','person','Salarié ou intérimaire'],['electricite',"Facture d'électricité",'bolt','Tous les 2 mois'],['charges','Autre dépense','wallet','Loyer, entretien, livraison…'],['clients','Nouveau client','users','Nom, téléphone, quartier']]]];
function openQuick(){
  form = null; document.body.classList.remove('menu');
  const go = NAV.flatMap(([,it])=>it).map(([k,l,i])=>`<button data-goq="${k}" data-txt="${esc(l.toLowerCase())} aller ouvrir${k==='calcul'?' calculatrice papier prix marge':''}">${ico(i)}<span>${l}</span><small>Ouvrir la page</small></button>`).join('');
  $('#layer').innerHTML = `<div class="qmenu" data-act="closeq"><div class="qbox" role="dialog" aria-modal="true" aria-label="Nouvelle saisie">
    <div class="qhead">${ico('search')}<input id="qinput" placeholder="Que voulez-vous enregistrer ou ouvrir ?" autocomplete="off" aria-label="Rechercher"><kbd>Échap</kbd></div>
    <div class="qbody">${QUICK.map(([g,items])=>`<div class="qblock"><div class="qsec">${g}</div><div class="qgrid">${items.map(([c,l,i,h])=>`<button data-qadd="${c}" data-txt="${esc((l+' '+h).toLowerCase())}">${ico(i)}<span>${l}</span><small>${h}</small></button>`).join('')}</div></div>`).join('')}
    <div class="qblock"><div class="qsec">Aller à</div><div class="qgrid">${go}</div></div></div>
    <div class="qfoot"><span><kbd>↑</kbd> <kbd>↓</kbd> choisir</span><span><kbd>Entrée</kbd> ouvrir</span><span><kbd>Ctrl K</kbd> depuis n'importe où</span></div></div></div>`;
  qSel(0); setTimeout(()=>$('#qinput')?.focus(),20);
}
const qVisible = () => [...document.querySelectorAll('.qgrid button')].filter(b => !b.hidden).sort((a,b)=>(+a.style.order||0)-(+b.style.order||0));
function qSel(i){ const v = qVisible(); v.forEach(b=>b.classList.remove('on')); if (v.length) { const k = (i+v.length)%v.length; v[k].classList.add('on'); v[k].scrollIntoView({block:'nearest'}); } }
function qFilter(t){
  t = t.trim().toLowerCase();
  document.querySelectorAll('.qgrid button').forEach(b => { b.hidden = !!t && !b.dataset.txt.includes(t); b.style.order = t && b.querySelector('span').textContent.toLowerCase().startsWith(t) ? -1 : 0; });
  document.querySelectorAll('.qblock').forEach(bl => bl.hidden = !bl.querySelector('.qgrid button:not([hidden])'));
  qSel(0);
}
addEventListener('hashchange', () => { const t = location.hash.slice(1); if (TABS.some(x=>x[0]===t)) { tab = t; render(); } });

// ---------- Rendu ----------
function render(){
  stamp++; cache.clear(); drawTabs(); document.body.classList.remove('menu');
  const v = {tableau:vTableau, achats:vAchats, production:vProduction,
    ventes:()=>vListe('ventes','Ventes',"Chaque vente diminue le stock de sacs et alimente le chiffre d'affaires et les créances clients."),
    clients:()=>vListe('clients','Clients','Vos clients, ce qu\'ils ont acheté et ce qu\'ils doivent encore.'), charges:vCharges, stock:vStock, calcul:vCalcul, produits:vProduits}[tab];
  $('#app').innerHTML = (demo ? `<div class="banner" style="align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:200px"><b>Exemple avec des chiffres inventés.</b> Rien de ce que vous modifiez ici n'est enregistré.</span><button class="btn small" data-act="stopdemo">Quitter l'exemple</button></div>` : '') + (mode==='local' && !demo ? `<div class="banner"><span>Les données sont enregistrées <b>seulement dans ce navigateur</b>. Renseignez la connexion Supabase dans js/config.js pour les retrouver sur tous vos appareils, et faites une sauvegarde régulière dans « Produits &amp; prix ».</span></div>` : '') + v();
}
function perSelect(){
  return `<div class="seg" role="group" aria-label="Période">${PERIODES.map(([k,l])=>`<button data-per="${k}" aria-pressed="${k===per}">${l}</button>`).join('')}</div>`;
}
function spark(vals, color){
  if (!vals || vals.filter(v=>v).length < 2) return '';
  const W=88,H=30, mx=Math.max(...vals), mn=Math.min(0,...vals), rg=(mx-mn)||1;
  const pts = vals.map((v,i)=>[i*(W-4)/(vals.length-1)+2, H-3-(v-mn)/rg*(H-6)]);
  const d = pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const last = pts[pts.length-1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d} L${last[0]} ${H} L2 ${H}Z" fill="${color}" opacity=".1"/><path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${color}"/></svg>`;
}
function delta(cur, prev, inverse){
  if (!prev || per!=='mois') return '';
  const ev = (cur-prev)/Math.abs(prev)*100; if (!isFinite(ev)) return '';
  const good = inverse ? ev<=0 : ev>=0;
  return `<span class="delta ${good?'up':'down'}" title="Par rapport à la même période du mois dernier">${ev>=0?'↑':'↓'} ${nf0.format(Math.abs(ev))} %</span>`;
}
function kpi(l, v, n, cls, x){ x = x||{}; const sp = spark(x.spark, x.color||'var(--c1)');
  return `<div class="kpi ${cls||''} ${sp?'has-spark':''}"><div class="l">${l}${x.delta||''}</div><div class="v">${v}</div>${n?`<div class="n">${n}</div>`:''}${sp}</div>`; }

function welcome(){ return `
    <div class="welcome"><div class="today">${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div><h2>Bienvenue sur ECOSAC</h2><p class="lead">Suivez vos conteneurs, vos bobines, votre production et vos ventes, et voyez le vrai prix de revient de chaque sac.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px"><button class="btn primary" data-act="seed">${ico('plus')}Créer le catalogue de base</button><button class="btn" data-act="demo">Voir un exemple rempli</button></div></div>
    <div class="grid two">
      <div class="panel step"><span class="num">1</span><h3 style="margin:0">Créez votre catalogue</h3><p class="note">Sacs croissant, chawarma, sacs à pain et sacs shopping, avec vos dimensions. Corrigez ensuite le grammage et le prix de chaque sac.</p><div><button class="btn" data-go="produits">Produits &amp; prix</button></div></div>
      <div class="panel step"><span class="num">2</span><h3 style="margin:0">Saisissez vos achats</h3><p class="note">Votre dernier conteneur (prix, transport, douane), vos bobines et votre colle. Le coût du papier par kg est calculé tout seul.</p><div><button class="btn" data-go="achats">Achats matière</button></div></div>
      <div class="panel step"><span class="num">3</span><h3 style="margin:0">Notez production et ventes</h3><p class="note">Chaque jour, appuyez sur « Nouvelle saisie » : sacs fabriqués, ventes, paiements. Le stock et les marges se mettent à jour.</p><div><button class="btn" data-go="production">Production</button></div></div>
    </div>`; }

const coutVentesDe = A => Object.entries(A.P).reduce((s,[pid,d]) => s + (d.vq && prod(pid) ? d.vq*detailCout(pid,A).total : 0), 0);
function vTableau(){
  if (!S.produits.length && !S.conteneurs.length && !S.ventes.length) return welcome();
  const [a,b] = periode(per); const A = analyse(a,b); const st = stock();
  const coutVentes = coutVentesDe(A);
  const marge = A.ca - coutVentes; const mPct = A.ca ? marge/A.ca*100 : 0;
  const creances = S.ventes.reduce((s,v)=>s+num(v.quantite)*num(v.prix_unitaire)-num(v.montant_paye),0);
  const depenses = A.achatsKraft + A.achatsColle + A.fixes;
  const coutProd = A.kraftUse*A.m.kraft + A.colleUse*A.m.colle + A.fixes;
  const cfg = config(); const alertK = num(cfg.seuil_kraft), alertC = num(cfg.seuil_colle);
  const alerts = [];
  if (alertK && st.kraft < alertK) alerts.push(`Stock de papier kraft bas : ${K(st.kraft)} (seuil ${K(alertK)}). Pensez à commander un conteneur.`);
  if (alertC && st.colle < alertC) alerts.push(`Stock de colle bas : ${K(st.colle)} (seuil ${K(alertC)}).`);
  if (st.kraft < -0.5) alerts.push(`Le stock de papier est négatif (${K(st.kraft)}) : un conteneur n'a peut-être pas été saisi.`);
  const sansPrix = S.produits.filter(p => !pvSac(p)).length;
  if (sansPrix) alerts.push(`${sansPrix} produit(s) sans prix de vente. Complétez-les dans « Produits &amp; prix ».`);
  const rows = sortedProds().map(p => {
    const d = A.P[p.id] || {q:0,vq:0,ca:0}; const c = detailCout(p.id, A);
    const pv = d.vq ? d.ca/d.vq : pvSac(p); const mu = pv - c.total; const mp = pv ? mu/pv*100 : 0;
    return {p,d,c,pv,mu,mp};
  });
  const mx = Math.max(1, ...rows.map(r=>r.d.vq));
  // comparaison avec la période précédente (mois)
  const ms = mois6(); const sk = k => ms.map(m=>m[k]);
  // comparaison juste : même nombre de jours au mois précédent
  const pm = (() => { const d = new Date(); const pd = new Date(d.getFullYear(), d.getMonth()-1, 1); const last = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
    const ym = `${pd.getFullYear()}-${String(pd.getMonth()+1).padStart(2,'0')}`; const P = analyse(ym+'-01', ym+'-'+String(Math.min(d.getDate(),last)).padStart(2,'0')); const c = coutVentesDe(P);
    return {ca:P.ca, marge:P.ca-c, sacs:P.sacs, enc:P.encaisse, dep:P.achatsKraft+P.achatsColle+P.fixes}; })();
  return `
  <div class="head"><div><div class="today">${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div><h2>Tableau de bord</h2><p class="lead">Combien vous coûte chaque sac et combien vous gagnez.</p></div><div class="sp"></div>${perSelect()}</div>
  ${alerts.map(t=>`<div class="banner"><span>${t}</span></div>`).join('')}
  <div class="grid kpis">
    ${kpi("Chiffre d'affaires", FK(A.ca), `${N(A.vSacs)} sacs vendus`, '', {spark:sk('ca'), delta:delta(A.ca, pm.ca)})}
    ${kpi('Marge sur les ventes', `<span class="${marge>=0?'':'neg'}">${FK(marge)}</span>`, A.ca ? `${nf1.format(mPct)} % du chiffre d'affaires` : 'Aucune vente sur la période','hl', {spark:sk('marge'), color:'var(--accent)', delta:delta(marge, pm.marge)})}
    ${kpi('Sacs fabriqués', N(A.sacs), `${K(A.kraftUse)} de papier · ${K(A.colleUse)} de colle`, '', {spark:sk('sacs'), delta:delta(A.sacs, pm.sacs)})}
    ${kpi('Argent encaissé', FK(A.encaisse), A.ca ? `${nf0.format(A.encaisse/A.ca*100)} % des ventes de la période` : 'Sur les ventes de la période', '', {spark:sk('enc'), delta:delta(A.encaisse, pm.enc)})}
    ${kpi('Prix de revient moyen', A.sacs ? F2(coutProd/A.sacs).replace(' FCFA','<small>FCFA</small>') : '—', 'Par sac fabriqué, tout compris')}
    ${kpi('Prix de vente moyen', A.vSacs ? F2(A.ca/A.vSacs).replace(' FCFA','<small>FCFA</small>') : '—', A.vSacs ? `Marge moyenne ${F2((A.ca-coutVentes)/A.vSacs)} par sac` : 'Par sac vendu')}
    ${kpi('Dépenses payées', FK(depenses), 'Matière achetée + charges', '', {spark:sk('dep'), color:'var(--c2)', delta:delta(depenses, pm.dep, true)})}
    ${kpi('Clients qui doivent', `<span class="${creances>0.5?'neg':''}">${FK(creances)}</span>`, 'Total des ventes non payées')}
  </div>
  <div class="grid charts" style="margin-top:12px">
    <div class="panel chart"><h3>Ventes, coûts et marge par mois</h3>${monthChart(ms,[{k:'ca',label:"Chiffre d'affaires",color:'var(--c1)'},{k:'cout',label:'Coût des sacs vendus',color:'var(--cg)'}],{k:'marge',label:'Marge',color:'var(--c2)'})}</div>
    <div class="panel"><h3>Où part l'argent</h3>${donut(A)}</div>
    <div class="panel"><h3>Chiffre d'affaires par produit</h3>${hbars(rows.filter(r=>r.d.ca>0).sort((x,y)=>y.d.ca-x.d.ca).map(r=>({l:r.p.nom,v:r.d.ca,t:F(r.d.ca),s:`${N(r.d.vq)} sacs`})),'var(--c1)','Aucune vente sur la période.')}</div>
    <div class="panel"><h3>Meilleurs clients</h3>${topClients(a,b)}</div>
    <div class="panel chart"><h3>Sacs fabriqués et vendus par mois</h3>${monthChart(ms,[{k:'sacs',label:'Fabriqués',color:'var(--cg)'},{k:'vendus',label:'Vendus',color:'var(--c1)'}],null,N)}</div>
    <div class="panel chart"><h3>Argent encaissé et dépensé par mois</h3>${monthChart(ms,[{k:'enc',label:'Encaissé',color:'var(--c3)'},{k:'dep',label:'Dépensé (achats + charges)',color:'var(--c2)'}])}</div>
  </div>
  <div class="panel" style="margin-top:12px"><h3>De quoi est fait le prix d'un sac</h3>${composition(rows)}</div>
  ${A.numSacs||A.numCout?`<div class="grid kpis" style="margin-top:12px">${kpi('Sacs imprimés en numérique', N(A.numSacs), A.numRates?`${N(A.numRates)} ratés`:'Sur la période')}${kpi("Coût d'impression numérique", F(A.numCout), numCoutSac(a,b)?F2(numCoutSac(a,b))+' par sac':'')}${kpi('Impression facturée', F(A.numFact))}${kpi("Marge sur l'impression numérique", `<span class="${A.numFact-A.numCout>=0?'pos':'neg'}">${F(A.numFact-A.numCout)}</span>`,'','hl')}</div>`:''}
  <div class="grid two" style="margin-top:12px">
    <div class="panel"><h3>Stock matière</h3>
      <div class="kv"><span>Papier kraft</span><span class="${st.kraft<0?'neg':''}">${K(st.kraft)}</span><span>Valeur du papier</span><span>${F(st.kraftVal)}</span><span>Colle</span><span class="${st.colle<0?'neg':''}">${K(st.colle)}</span><span>Coût moyen du papier</span><span>${F2(A.m.kraft)} / kg</span><span>Coût moyen de la colle</span><span>${F2(A.m.colle)} / kg</span></div>
      ${st.m.kraftKg ? `<div class="bar" title="Papier restant"><i style="width:${Math.max(0,Math.min(100,st.kraft/st.m.kraftKg*100))}%"></i></div><div class="note">${nf0.format(Math.max(0,st.kraft/st.m.kraftKg*100))} % du papier acheté reste en stock${autonomie(st)}</div>` : ''}
    </div>
    <div class="panel"><h3>Sacs finis en stock</h3>${hbars(st.finis.filter(f=>f.reste>0).sort((x,y)=>y.reste-x.reste).map(f=>({l:f.p.nom,v:f.reste,t:N(f.reste)+' sacs',s:F(f.valeur)})),'var(--c3)','Aucun sac en stock.')}</div>
  </div>
  <h3 style="margin-top:22px">Prix de revient et marge par sac</h3>
  <div class="tw"><table><thead><tr><th>Produit</th><th class="num">Papier + colle</th><th class="num">Impression</th><th class="num">Frais fixes</th><th class="num">Prix de revient</th><th class="num">Prix de vente</th><th class="num">Marge / sac</th><th class="num">Marge</th><th class="num">Fabriqués</th><th>Vendus</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td>${esc(r.p.nom)}</td><td class="num">${F2(r.c.papier)}</td><td class="num">${F2(r.c.colle)}</td><td class="num">${F2(r.c.impr)}</td><td class="num">${F2(r.c.fixe)}</td><td class="num"><b>${F2(r.c.total)}</b></td><td class="num">${r.pv?F2(r.pv):'<span class="pill warn">à renseigner</span>'}</td><td class="num ${r.mu>=0?'pos':'neg'}">${r.pv?F2(r.mu):'—'}</td><td class="num">${r.pv?`<span class="pill ${r.mp>=25?'good':r.mp>=10?'warn':'bad'}">${nf0.format(r.mp)} %</span>`:'—'}</td><td class="num">${N(r.d.q)}</td><td><div style="display:flex;align-items:center;gap:8px"><span style="min-width:48px;text-align:right;font-variant-numeric:tabular-nums">${N(r.d.vq)}</span><div class="bar" style="width:70px;margin:0"><i style="width:${r.d.vq/mx*100}%"></i></div></div></td></tr>`).join('')}
  </tbody></table></div>
  <p class="note">Papier et colle : coût moyen d'achat rendu usine (bobines + transport + douane + frais) × quantité réellement utilisée par sac. Frais fixes : personnel + électricité + fournitures (graisse, huile, encre, cartons, scotch…) + autres dépenses de la période, répartis à parts égales sur tous les sacs fabriqués. Marge en vert à partir de 25 %, orange de 10 à 25 %, rouge en dessous.</p>`;
}
function autonomie(st){
  const [a,b] = periode('3m'); const A = analyse(a,b); const parJour = A.kraftUse/90;
  return parJour > 0 && st.kraft > 0 ? `. Au rythme des 3 derniers mois, il reste environ <b>${nf0.format(st.kraft/parJour)} jours</b> de papier.` : '';
}
function mois6(){
  const d = new Date(); const ms = [];
  for (let i=5;i>=0;i--){ const x = new Date(d.getFullYear(), d.getMonth()-i, 1); const y = x.getFullYear(), m = x.getMonth();
    const a = `${y}-${String(m+1).padStart(2,'0')}-01`, b = `${y}-${String(m+1).padStart(2,'0')}-${String(new Date(y,m+1,0).getDate()).padStart(2,'0')}`;
    const A = analyse(a,b); const cout = coutVentesDe(A);
    ms.push({l:MOIS[m], ca:A.ca, cout, marge:A.ca-cout, sacs:A.sacs, vendus:A.vSacs, enc:A.encaisse, dep:A.achatsKraft+A.achatsColle+A.fixes}); }
  return ms;
}
const court = v => { const a = Math.abs(v); return (v<0?'−':'') + (a>=1e6?nf1.format(a/1e6)+' M':a>=1e3?nf0.format(a/1e3)+' k':nf0.format(a)); };
function monthChart(ms, series, line, fmt){
  fmt = fmt || F;
  const W=560,H=230,L=52,R=8,B=26,T=12;
  const vals = ms.flatMap(m => series.map(s=>m[s.k]).concat(line?[m[line.k]]:[]));
  if (!vals.some(v=>v)) return '<p class="note">Pas encore de données sur les 6 derniers mois.</p>';
  let hi = Math.max(0,...vals), lo = Math.min(0,...vals);
  const raw = (hi-lo)/4 || 1; const p = Math.pow(10, Math.floor(Math.log10(raw))); const step = [1,2,2.5,5,10].find(s=>s*p>=raw)*p;
  hi = Math.ceil(hi/step)*step; lo = Math.floor(lo/step)*step; if (hi===lo) hi = lo+step;
  const y = v => T + (H-T-B)*(hi-v)/(hi-lo); const bw = (W-L-R)/ms.length; const n = series.length; const w = Math.min(20,(bw-16)/n);
  const bar = (x,v,w) => { const top = y(Math.max(0,v)), bot = y(Math.min(0,v)), h = Math.max(bot-top, v?1.5:0), rr = Math.min(4,w/2,h); if (!h) return '';
    return v>=0 ? `M${x} ${top+h} V${top+rr} Q${x} ${top} ${x+rr} ${top} H${x+w-rr} Q${x+w} ${top} ${x+w} ${top+rr} V${top+h} Z` : `M${x} ${top} V${top+h-rr} Q${x} ${top+h} ${x+rr} ${top+h} H${x+w-rr} Q${x+w} ${top+h} ${x+w} ${top+h-rr} V${top} Z`; };
  let g = '';
  for (let v=lo; v<=hi+step/2; v+=step) g += `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="${v===0?'var(--line2)':'var(--line)'}" stroke-width="1" ${v===0?'':'stroke-dasharray="3 4"'}/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${court(v)}</text>`;
  ms.forEach((m,i) => { const cx = L + bw*i + bw/2;
    const tip = `<b>${m.l}</b><br>${series.map(s=>`${s.label} : ${fmt(m[s.k])}`).join('<br>')}${line?`<br>${line.label} : ${fmt(m[line.k])}`:''}`;
    g += `<g data-tip="${esc(tip)}"><rect x="${L+bw*i}" y="${T}" width="${bw}" height="${H-T-B}" fill="transparent"/>`;
    series.forEach((s,j) => { const v = m[s.k]; const x = cx - (n*w+(n-1)*2)/2 + j*(w+2); g += `<path d="${bar(x,v,w)}" fill="${s.color}"/>`; });
    g += `</g><text x="${cx}" y="${H-8}" text-anchor="middle">${m.l}</text>`; });
  if (line) { const pts = ms.map((m,i)=>[L+bw*i+bw/2, y(m[line.k])]);
    g += `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${line.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>`;
    pts.forEach((p,i)=> g += `<circle cx="${p[0]}" cy="${p[1]}" r="${i===pts.length-1?5:4}" fill="${line.color}" stroke="var(--surface)" stroke-width="2" pointer-events="none"/>`); }
  const last = ms[ms.length-1];
  return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graphique mensuel">${g}</svg><div class="legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${s.label} <b>${fmt(last[s.k])}</b></span>`).join('')}${line?`<span><i style="background:${line.color};height:2px;width:12px"></i>${line.label} <b>${fmt(last[line.k])}</b></span>`:''}</div><div class="note" style="margin-top:4px">Valeurs du mois en cours · survolez une colonne pour le détail</div>`;
}
function donut(A){
  const items = [['Papier kraft utilisé', A.kraftUse*A.m.kraft,'var(--c1)'],['Colle utilisée', A.colleUse*A.m.colle,'var(--c2)'],['Personnel', A.personnel,'var(--c3)'],['Électricité', A.elec,'var(--c4)'],['Fournitures', A.fourn,'var(--c5)'],['Clichés (non facturés)', A.clich,'var(--c6)'],['Impression numérique', A.numCout,'var(--c7)'],['Autres dépenses', A.autres,'var(--c8)']];
  const t = items.reduce((s,i)=>s+i[1],0); if (!t) return '<p class="note">Aucune production ni dépense sur la période.</p>';
  const r = 60, C = 2*Math.PI*r; let off = 0, segs = '';
  items.forEach(([l,v,c]) => { if (!v) return; const len = v/t*C; segs += `<circle data-tip="${esc(`<b>${l}</b><br>${F(v)} · ${nf0.format(v/t*100)} %`)}" r="${r}" cx="80" cy="80" fill="none" stroke="${c}" stroke-width="20" stroke-dasharray="${Math.max(0,len-2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"/>`; off += len; });
  return `<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><svg class="viz" viewBox="0 0 160 160" style="width:168px;max-width:100%;flex:none" role="img" aria-label="Répartition des coûts">${segs}<text x="80" y="74" text-anchor="middle" style="fill:var(--muted);font-size:10.5px">Total</text><text x="80" y="95" text-anchor="middle" style="fill:var(--fg);font-size:19px;font-weight:600;font-family:var(--f-display)">${court(t)}</text></svg>
  <div style="flex:1;min-width:min(100%,220px);display:grid;gap:6px">${items.filter(i=>i[1]).map(([l,v,c])=>`<div style="display:flex;gap:8px;align-items:center;font-size:13px"><i style="width:8px;height:8px;border-radius:2px;background:${c};flex:none"></i><span style="flex:1;color:var(--fg2)">${l}</span><span style="font-variant-numeric:tabular-nums">${F(v)}</span><span class="note" style="width:38px;text-align:right">${nf0.format(v/t*100)} %</span></div>`).join('')}</div></div>
  <div class="note" style="margin-top:8px">Coût de production de la période : <b>${F(t)}</b></div>`;
}
function hbars(items, color, vide){
  if (!items.length) return `<p class="note">${vide}</p>`;
  const mx = Math.max(...items.map(i=>i.v)); 
  return `<div style="display:grid;gap:10px">${items.slice(0,8).map(i=>`<div><div class="hrow"><span style="min-width:0">${esc(i.l)}</span><span style="font-variant-numeric:tabular-nums"><b>${i.t}</b>${i.s?` <span class="note">· ${i.s}</span>`:''}</span></div><div class="bar"><i style="width:${i.v/mx*100}%;background:${color}"></i></div></div>`).join('')}</div>${items.length>8?`<div class="note" style="margin-top:6px">+ ${items.length-8} autres</div>`:''}`;
}
function topClients(a,b){
  const C = {}; S.ventes.filter(v=>inP(v.date,a,b)).forEach(v => { const c = C[v.client] ||= {ca:0,du:0}; const t = num(v.quantite)*num(v.prix_unitaire); c.ca += t; c.du += t-num(v.montant_paye); });
  return hbars(Object.entries(C).sort((x,y)=>y[1].ca-x[1].ca).map(([id,c])=>({l:clientNom(id),v:c.ca,t:F(c.ca),s:c.du>0.5?`<span class="neg">doit ${F(c.du)}</span>`:'payé'})),'var(--c1)','Aucune vente sur la période.');
}
function composition(rows){
  const rs = rows.filter(r=>r.c.total>0); if (!rs.length) return '<p class="note">Ajoutez des produits pour voir leur prix de revient.</p>';
  const mx = Math.max(...rs.map(r=>Math.max(r.c.total, r.pv||0)));
  const parts = [['papier','Papier','var(--c1)'],['colle','Colle','var(--c2)'],['impr','Impression','var(--c3)'],['fixe','Frais fixes','var(--c4)']];
  return `<div class="legend" style="margin:0 0 10px">${parts.map(p=>`<span><i style="background:${p[2]}"></i>${p[1]}</span>`).join('')}<span><i style="background:var(--fg);width:2px;height:12px"></i>Prix de vente</span></div>
  <div style="display:grid;gap:9px">${rs.map(r=>`<div class="comp"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">${esc(r.p.nom)}</span>
    <div class="viz" style="position:relative;height:12px" data-tip="${esc(`<b>${r.p.nom}</b><br>${parts.map(([k,l])=>`${l} : ${F2(r.c[k])}`).join('<br>')}<br>Prix de revient : <b>${F2(r.c.total)}</b>${r.pv?`<br>Prix de vente : ${F2(r.pv)}`:''}`)}"><div style="position:absolute;inset:0;background:var(--surface3);border-radius:99px;overflow:hidden;display:flex;gap:2px">${parts.map(([k,l,c])=>{const w=r.c[k]/mx*100; return w?`<i style="flex:none;width:${w}%;background:${c}"></i>`:'';}).join('')}</div>${r.pv?`<i style="position:absolute;left:calc(${r.pv/mx*100}% - 1px);width:2px;top:-4px;bottom:-4px;background:var(--fg);border-radius:2px"></i>`:''}</div>
    <span style="font-variant-numeric:tabular-nums;white-space:nowrap"><b>${F2(r.c.total)}</b>${r.pv?` <span class="note">/ ${F2(r.pv)}</span>`:''}</span></div>`).join('')}</div>
  <div class="note" style="margin-top:8px">La barre colorée montre le prix de revient, le trait noir votre prix de vente. L'écart entre les deux est votre marge.</div>`;
}
// ---------- Démonstration ----------
function demoData(){
  let seedN = 7; const rnd = () => (seedN = (seedN*16807) % 2147483647) / 2147483647;
  const D = {}; COLS.forEach(c => D[c] = []);
  const iso = dt => new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())).toISOString().slice(0,10);
  const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth()-5, 1);
  const prices = [15,18,24,20,25,30,45,110,160];
  SEED.forEach((p,i) => { const q = p.longueur ? {} : {longueur:32,largeur:24,cote:10,grammage:80}; const e = estimePapier({...p,...q});
    D.produits.push({...p, ...q, id:'p'+i, prix_vente:prices[i], exemple:false, notes:'', g_papier:+e.g.toFixed(1)}); });
  ['Boulangerie du Plateau','Pâtisserie Les Délices','Supermarché Cocody','Boulangerie Yopougon Centre','Grossiste Adjamé','Hôtel Ivoire Events'].forEach((n,i)=>D.clients.push({id:'c'+i,nom:n,type:['boulangerie','boulangerie','boutique','boulangerie','grossiste','entreprise'][i],telephone:'',quartier:''}));
  const c1 = new Date(start.getFullYear(), start.getMonth(), 3), c2 = new Date(now.getFullYear(), now.getMonth()-2, 12);
  [c1,c2].forEach((d,i)=>{ for (let j=0;j<14;j++){ const pi = j%9; const p = D.produits[pi]; const e = estimePapier(p); const kg = 650+Math.round(rnd()*200); const st = i===0 ? 'finie' : j<3 ? 'finie' : j<5 ? 'cours' : 'stock';
    const b = {id:`b${i}_${j}`,numero:`${i?'B':'A'}-${String(j+1).padStart(2,'0')}`,conteneur:'k'+i,produit:p.id,poids_kg:kg,grammage:p.grammage,laize:+e.w.toFixed(1),statut:st};
    if (st==='finie') b.sacs_reels = Math.round(kg*1000/p.g_papier*(0.86+rnd()*0.11)); D.bobines.push(b); } });
  [c1,c2].forEach((d,i)=>D.conteneurs.push({id:'k'+i,date:iso(d),reference:'MSKU'+(48210+i*317),fournisseur:'Guangzhou Paper Co.',nb_bobines:28,poids_kg:22000,grammage:70,devise:'USD',prix_achat:16500+i*400,taux:610,transport:2600000,douane:3100000,autres_frais:550000}));
  for (let m=0;m<6;m++){
    const y = start.getFullYear(), mo = start.getMonth()+m; const last = m===5 ? now.getDate() : new Date(y,mo+1,0).getDate();
    D.colle.push({id:'g'+m,date:iso(new Date(y,mo,2)),fournisseur:'Colles Abidjan SARL',quantite_kg:120,prix_total:120*1500});
    D.charges.push({id:'l'+m,date:iso(new Date(y,mo,5)),categorie:'loyer',libelle:'Loyer atelier',montant:150000});
    if (m%2===1) D.charges.push({id:'e'+m,date:iso(new Date(y,mo,18)),categorie:'entretien',libelle:'Pièces machine',montant:60000+Math.round(rnd()*40000)});
    if (m<5 || now.getDate()>=28) D.personnel.push({id:'s'+m,date:iso(new Date(y,mo,28)),nom:'Kouadio',type:'salarie',periode:MOIS[(mo+12)%12],montant:120000});
    for (let w=0; w<3; w++) if (7+w*8<=last) D.personnel.push({id:'i'+m+w,date:iso(new Date(y,mo,7+w*8)),nom:['Ange','Moussa','Awa'][w],type:'interim',periode:'5 jours',montant:25000});
    if (m%2===1) { const deb = new Date(y,mo-1,1), fin = new Date(y,mo+1,0); D.electricite.push({id:'el'+m,date:iso(new Date(y,mo,20)),debut:iso(deb),fin:iso(fin),montant:170000+Math.round(rnd()*30000),kwh:1800}); }
    for (let day=2; day<=last; day+=3){
      const dt = iso(new Date(y,mo,day)); const croiss = Math.floor(rnd()*4);
      const runs = [[croiss, 8000+Math.round(rnd()*10000)], [4+Math.floor(rnd()*3), 4000+Math.round(rnd()*3000)]];
      if (day%9===2) runs.push([7+Math.floor(rnd()*2), 600+Math.round(rnd()*900)]);
      runs.forEach(([pi,q],k) => { const p = D.produits[pi]; D.productions.push({id:`r${m}_${day}_${k}`,date:dt,produit:p.id,quantite:q,kraft_kg:+(q*p.g_papier/1000*(1.03+rnd()*0.04)).toFixed(1),colle_kg:+(q*p.g_colle/1000).toFixed(2)});
        const ci = pi>=7 ? (rnd()<.5?5:2) : Math.floor(rnd()*5); const vq = Math.round(q*(0.82+rnd()*0.15)); const tot = vq*p.prix_vente;
        D.ventes.push({id:`v${m}_${day}_${k}`,date:iso(new Date(y,mo,Math.min(last,day+1))),client:'c'+ci,produit:p.id,quantite:vq,prix_unitaire:p.prix_vente,montant_paye:rnd()<.8||m<4?tot:Math.round(tot*0.4),paiement:rnd()<.6?'especes':'mobile'}); });
    }
  }
  const FD = [['Graisse',2,'kg',6000],['Huile',5,'litre',2500],['Encre',4,'kg',9000],['Cartons',150,'pièce',350],['Scotch',24,'rouleau',600],['Sopalin',12,'rouleau',800],['Lingettes bébé',10,'paquet',1200],['Lingettes imprimante',4,'boîte',3500],['Encre imprimante numérique',2,'litre',38000]];
  for (let m=0;m<6;m++){ const y = start.getFullYear(), mo = start.getMonth()+m; const last = m===5 ? now.getDate() : new Date(y,mo+1,0).getDate();
    FD.forEach(([a,q,u,pu],i) => { if ((m+i)%2 && i>1) return; D.fournitures.push({id:`f${m}_${i}`,date:iso(new Date(y,mo,Math.min(last,4+i))),article:a,quantite:q,unite:u,prix_total:q*pu,fournisseur:'Adjamé',usage:/imprimante/i.test(a)?'numerique':'general'});
      D.sorties.push({id:`o${m}_${i}`,date:iso(new Date(y,mo,Math.min(last,15+i))),article:a,quantite:+(q*(0.6+rnd()*0.3)).toFixed(1)}); }); }
  [['c5','Logo Hôtel Ivoire, 2 couleurs',2,45000,25000],['c2','Logo Supermarché Cocody',1,30000,0]].forEach(([cl,logo,co,cout,ref],i)=>D.cliches.push({id:'cl'+i,date:iso(new Date(start.getFullYear(),start.getMonth(),10+i)),client:cl,logo,produit:'p8',couleurs:co,cout,refacture:ref,statut:'actif'}));
  D.ventes.forEach(v => { if (v.produit==='p8') v.cliche = v.client==='c5' ? 'cl0' : v.client==='c2' ? 'cl1' : ''; });
  for (let m=0;m<6;m++){ const y = start.getFullYear(), mo = start.getMonth()+m; const last = m===5 ? now.getDate() : new Date(y,mo+1,0).getDate();
    for (let j=0;j<3;j++) if (6+j*9<=last) D.numerique.push({id:`n${m}_${j}`,date:iso(new Date(y,mo,6+j*9)),client:['c1','c4','c3'][j],produit:'p7',quantite:400+Math.round(rnd()*600),rates:Math.round(rnd()*15),motif:'Logo client',supplement:60}); }
  D.parametres.push({id:'config',seuil_kraft:5000,seuil_colle:50});
  return D;
}
function startDemo(){ realS = {}; COLS.forEach(c => realS[c] = S[c]); const D = demoData(); COLS.forEach(c => S[c] = D[c]); demo = true; tab = 'tableau'; per = 'mois'; render(); scrollTo({top:0}); }
function stopDemo(){ COLS.forEach(c => S[c] = realS[c]); realS = null; demo = false; render(); scrollTo({top:0}); }

let filtreCol = {};
function table(col, rows){
  const sc = SCHEMAS[col];
  if (!rows.length) return `<div class="tw"><div class="empty">${q[col]?`<b>Aucun résultat</b>Rien ne correspond à « ${esc(q[col])} ».`:(col==='estimations' ? `<b>Aucune estimation enregistrée</b>Faites un calcul puis cliquez sur « Enregistrer cette estimation ».` : `<b>Rien pour l'instant</b>Cliquez sur « Ajouter » pour saisir ${col==='clients'?'votre premier client':'la première ligne'}.`)}</div></div>`;
  const cell = (c, r) => { const [k,,fmt,cls] = c; const raw = typeof k === 'function' ? k(r) : r[k]; if (cls==='html') return raw; return fmt ? (raw===''||raw==null ? '' : fmt(cls==='num'?num(raw):raw)) : esc(raw); };
  let foot = '';
  if (sc.sum) {
    foot = `<tfoot><tr>${sc.cols.map((c,i)=>{ if (i===0) return `<td>Total (${rows.length})</td>`; if (!sc.sum.includes(c[1])) return '<td></td>';
      const k=c[0]; const s=rows.reduce((t,r)=>t+num(typeof k==='function'?k(r):r[k]),0); return `<td class="num">${c[2]?c[2](s):N(s)}</td>`; }).join('')}<td></td></tr></tfoot>`;
  }
  return `<div class="tw"><table><thead><tr>${sc.cols.map(c=>`<th class="${c[3]==='num'?'num':''}">${c[1]}</th>`).join('')}<th></th></tr></thead><tbody>
    ${rows.map(r=>`<tr data-open="${col}" data-id="${esc(r.id)}">${sc.cols.map(c=>`<td class="${c[3]==='num'?'num':''}">${cell(c,r)}</td>`).join('')}<td><div class="actions" data-row="${esc(r.id)}"><button class="iconbtn" data-edit="${col}" data-id="${esc(r.id)}" aria-label="Modifier" title="Modifier">${ico('edit')}</button><button class="iconbtn del" data-del="${col}" data-id="${esc(r.id)}" aria-label="Supprimer" title="Supprimer">${ico('trash')}</button></div></td></tr>`).join('')}
  </tbody>${foot}</table></div>`;
}
function rowsFor(col){
  let rows = [...S[col]];
  if (col==='produits') return sortedProds();
  if (col==='bobines') return rows.sort((a,b)=>(a.statut==='finie')-(b.statut==='finie') || String(a.numero).localeCompare(String(b.numero),'fr',{numeric:true}));
  if (col==='clients') return rows.sort((a,b)=>String(a.nom).localeCompare(b.nom,'fr'));
  if (filtreCol[col] && filtreCol[col] !== 'tout') { const [a,b] = periode(filtreCol[col]); rows = rows.filter(r => inP(r.date,a,b)); }
  return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
const q = {};
function searched(col){
  const t = (q[col]||'').trim().toLowerCase(); const rows = rowsFor(col); if (!t) return rows;
  return rows.filter(r => [...Object.values(r), r.client&&clientNom(r.client), r.produit&&prodNom(r.produit), r.date&&fdate(r.date)].join(' ').toLowerCase().includes(t));
}
function listBlock(col){
  const dated = !['clients','produits','bobines'].includes(col); const rows = searched(col);
  return `<div class="toolbar"><label class="search">${ico('search')}<input type="search" data-q="${col}" placeholder="Rechercher…" value="${esc(q[col]||'')}" aria-label="Rechercher"></label>${dated?filtre(col):''}<span class="count" id="cnt-${col}">${N(rows.length)} ligne${rows.length>1?'s':''}</span></div><div id="tbl-${col}">${table(col, rows)}</div>`;
}
function filtre(col){ const f = filtreCol[col] || 'tout'; return `<select data-filtre="${col}" aria-label="Filtrer par période" style="width:auto">${PERIODES.map(([k,l])=>`<option value="${k}" ${k===f?'selected':''}>${l}</option>`).join('')}</select>`; }
function vListe(col, titre, lead){
  const sc = SCHEMAS[col]; const needProd = ['productions','ventes'].includes(col) && !S.produits.length;
  const needCli = col==='ventes' && !S.clients.length;
  return `<div class="head"><div><h2>${titre}</h2><p class="lead">${lead}</p></div><div class="sp"></div><button class="btn primary" data-add="${col}">${ico('plus')}Ajouter</button></div>
  ${needProd?`<div class="banner info"><span>Créez d'abord votre catalogue dans <a href="#produits">Produits &amp; prix</a>.</span></div>`:''}
  ${needCli?`<div class="banner info"><span>Astuce : vous pouvez créer un client directement depuis le formulaire de vente.</span></div>`:''}
  ${listBlock(col)}`;
}
function subnav(group, items){ return `<div class="subtabs">${items.map(([k,l])=>`<button data-sub="${group}" data-val="${k}" aria-pressed="${sub[group]===k}">${l}</button>`).join('')}</div>`; }
function vAchats(){
  const col = sub.achats; const m = moyennes();
  const lead = {conteneurs:'Chaque conteneur de bobines venu de Chine avec son transport et sa douane.', bobines:"Chaque bobine correspond à un format de sac. À partir de son poids, du grammage et de la laize, la plateforme calcule combien de sacs elle doit donner. Quand elle est terminée, notez les sacs réellement produits pour voir le rendement.", colle:'Vos achats de colle à Abidjan.', cliches:"Les plaques en plastique gravées avec le logo de chaque client et montées sur le cylindre. La part non facturée au client compte dans les frais du mois. En choisissant le cliché sur chaque vente, vous voyez combien de sacs il a imprimés et ce qu'il coûte par sac.", fournitures:'Graisse, huile, encre, cartons, scotch, Sopalin, lingettes… Chaque achat compte dans les frais du mois.', sorties:"Notez ce que vous sortez du magasin pour suivre ce qu'il reste en stock."}[col];
  const fs = fournituresStock(); const [fa,fb] = periode('mois');
  return `<div class="head"><div><h2>Achats matière</h2><p class="lead">${lead}</p></div><div class="sp"></div><button class="btn primary" data-add="${col}">${ico('plus')}Ajouter</button></div>
  ${subnav('achats',[['conteneurs','Conteneurs kraft'],['bobines','Bobines'],['colle','Colle'],['cliches','Clichés'],['fournitures','Autres fournitures'],['sorties','Utilisation des fournitures']])}
  <div class="grid kpis" style="margin-bottom:14px">${col==='fournitures'||col==='sorties'
    ? kpi('Fournitures achetées ce mois', F(S.fournitures.filter(r=>inP(r.date,fa,fb)).reduce((s,r)=>s+num(r.prix_total),0)))+kpi('Total depuis le début', F(fs.reduce((s,f)=>s+f.cout,0)), `${fs.length} article(s)`)+kpi('Valeur en stock', F(fs.reduce((s,f)=>s+Math.max(0,f.valeur),0)),'Voir le détail dans Stock','hl')
    : col==='bobines' ? bobinesKpis()
    : col==='cliches' ? kpi('Clichés en service', N(S.cliches.filter(c=>c.statut==='actif').length), `${N(S.cliches.length)} au total`)+kpi('Coût total des clichés', F(S.cliches.reduce((s,c)=>s+num(c.cout),0)), `dont ${F(S.cliches.reduce((s,c)=>s+num(c.refacture),0))} facturés aux clients`)+kpi('Clients avec impression', N(new Set(S.cliches.map(c=>c.client)).size),'','hl')
    : col==='conteneurs'
    ? kpi('Papier acheté', K(m.kraftKg), `${S.conteneurs.length} conteneur(s)`)+kpi('Coût total rendu usine', F(m.kraftCout))+kpi('Coût moyen du papier', F2(m.kraft)+' / kg','','hl')
    : kpi('Colle achetée', K(m.colleKg))+kpi('Total dépensé', F(m.colleCout))+kpi('Prix moyen', F2(m.colle)+' / kg','','hl')}</div>
  ${listBlock(col)}`;
}
function vProduction(){
  const col = sub.production; const [a,b] = periode('mois'); const A = analyse(a,b); const T = analyse(null,null);
  const lead = col==='productions' ? "Notez chaque jour ce que vous fabriquez. Le papier et la colle utilisés sont calculés automatiquement." : "Les sacs déjà fabriqués que vous passez dans l'imprimante numérique. Le coût par sac vient de vos achats d'encre et de consommables marqués « Imprimante numérique » dans Achats › Autres fournitures.";
  const needProd = !S.produits.length;
  return `<div class="head"><div><h2>Production</h2><p class="lead">${lead}</p></div><div class="sp"></div><button class="btn primary" data-add="${col}">${ico('plus')}Ajouter</button></div>
  ${subnav('production',[['productions','Fabrication des sacs'],['numerique','Impression numérique']])}
  ${needProd?`<div class="banner info"><span>Créez d'abord votre catalogue dans <a href="#produits">Produits &amp; prix</a>.</span></div>`:''}
  ${col==='numerique'?`<div class="grid kpis" style="margin-bottom:14px">${kpi('Sacs imprimés ce mois', N(A.numSacs), A.numRates?`${N(A.numRates)} ratés`:'')}${kpi("Coût d'impression par sac", numCoutSac(a,b)?F2(numCoutSac(a,b)):'—', 'Encre et consommables ÷ sacs imprimés')}${kpi('Facturé ce mois', F(A.numFact))}${kpi("Marge sur l'impression", `<span class="${A.numFact-A.numCout>=0?'pos':'neg'}">${F(A.numFact-A.numCout)}</span>`, `Depuis le début : ${F(T.numFact-T.numCout)}`,'hl')}</div>`:''}
  ${listBlock(col)}`;
}
function vCharges(){
  const col = sub.charges;
  const lead = {personnel:"Salaire de votre employé et paiements des intérimaires.", electricite:"Une ligne par facture (tous les 2 mois). Le montant est réparti jour par jour sur la période facturée pour un calcul juste chaque mois.", charges:'Loyer, entretien des machines, livraisons, clichés… (graisse, huile, encre, cartons, scotch : dans Achats › Autres fournitures)'}[col];
  return `<div class="head"><div><h2>Charges</h2><p class="lead">${lead}</p></div><div class="sp"></div><button class="btn primary" data-add="${col}">${ico('plus')}Ajouter</button></div>
  ${subnav('charges',[['personnel','Personnel'],['electricite','Électricité'],['charges','Autres dépenses']])}
  ${listBlock(col)}`;
}
function bobinesKpis(){
  const st = S.bobines.filter(b=>b.statut!=='finie'); const fin = S.bobines.filter(b=>b.statut==='finie' && num(b.sacs_reels) && bobineCalc(b));
  const att = fin.reduce((s,b)=>s+bobineCalc(b).sacs,0), reel = fin.reduce((s,b)=>s+num(b.sacs_reels),0);
  return kpi('Bobines en stock ou en cours', N(st.length), K(st.reduce((s,b)=>s+num(b.poids_kg),0)))+kpi('Sacs possibles avec ces bobines', N(st.reduce((s,b)=>s+(bobineCalc(b)?.sacs||0),0)),'Selon les formats prévus')+kpi('Rendement moyen', att?nf0.format(reel/att*100)+' %':'—', att?`${N(reel)} sacs réels sur ${N(att)} attendus`:'Notez les sacs réels des bobines terminées','hl');
}
function bobinesParSac(){
  const M = {}; S.bobines.filter(b=>b.statut!=='finie').forEach(b => { const m = M[b.produit] ||= {n:0,kg:0,sacs:0,cours:0}; m.n++; m.kg += num(b.poids_kg); m.sacs += bobineCalc(b)?.sacs||0; if (b.statut==='cours') m.cours++; });
  const rows = sortedProds().filter(p=>M[p.id]).map(p=>({p,...M[p.id]}));
  if (!rows.length) return `<div class="tw"><div class="empty"><b>Aucune bobine enregistrée</b>Ajoutez vos bobines dans <a href="#achats" data-sub="achats" data-val="bobines">Achats › Bobines</a> pour savoir combien de sacs vous pouvez encore fabriquer.</div></div>`;
  return `<div class="tw"><table><thead><tr><th>Type de sac</th><th class="num">Bobines</th><th class="num">Dont en cours</th><th class="num">Poids</th><th class="num">Sacs possibles</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.p.nom)}</td><td class="num">${N(r.n)}</td><td class="num">${N(r.cours)}</td><td class="num">${K(r.kg)}</td><td class="num"><b>${N(r.sacs)}</b></td></tr>`).join('')}</tbody></table></div>`;
}
function fournTable(){
  const fs = fournituresStock();
  if (!fs.length) return `<div class="tw"><div class="empty"><b>Aucune fourniture</b>Ajoutez vos achats de graisse, huile, encre, cartons… dans <a href="#achats" data-sub="achats" data-val="fournitures">Achats › Autres fournitures</a>.</div></div>`;
  return `<div class="tw"><table><thead><tr><th>Article</th><th class="num">Acheté</th><th class="num">Utilisé</th><th class="num">En stock</th><th class="num">Prix moyen</th><th class="num">Valeur</th><th>Dernier achat</th><th></th></tr></thead><tbody>
  ${fs.map(f=>`<tr><td>${esc(f.nom)}</td><td class="num">${nf2.format(f.achete)} ${esc(f.unite)}</td><td class="num">${nf2.format(f.utilise)}</td><td class="num"><b>${nf2.format(f.reste)}</b> ${esc(f.unite)}</td><td class="num">${F2(f.pu)}</td><td class="num">${F(f.valeur)}</td><td>${fdate(f.dernier)}</td><td>${f.reste<0?'<span class="pill bad">Utilisé > acheté</span>':f.achete&&f.reste<=f.achete*0.15?'<span class="pill warn">Bientôt épuisé</span>':''}</td></tr>`).join('')}</tbody></table></div>
  <p class="note">Le stock baisse quand vous notez une sortie dans Achats › Utilisation des fournitures. Si vous ne notez pas les sorties, les achats comptent quand même dans vos coûts.</p>`;
}
function vStock(){
  const st = stock(); const tot = st.finis.reduce((s,f)=>s+Math.max(0,f.valeur),0);
  return `<div class="head"><div><h2>Stock</h2><p class="lead">Calculé automatiquement : achats moins production pour la matière, production moins ventes pour les sacs.</p></div></div>
  <div class="grid kpis">${kpi('Papier kraft en stock', K(st.kraft), `${K(st.m.kraftKg)} achetés · ${K(st.ku)} utilisés`, st.kraft<0?'':'hl')}${kpi('Valeur du papier', F(st.kraftVal))}${kpi('Colle en stock', K(st.colle), `${K(st.m.colleKg)} achetés · ${K(st.cu)} utilisés`)}${kpi('Valeur des sacs en stock', F(tot), 'Au prix de revient')}</div>
  <h3 style="margin-top:22px">Sacs finis</h3>
  ${st.finis.length?`<div class="tw"><table><thead><tr><th>Produit</th><th class="num">Fabriqués</th><th class="num">Vendus</th><th class="num">En stock</th><th class="num">Valeur</th><th></th></tr></thead><tbody>
  ${st.finis.map(f=>`<tr><td>${esc(f.p.nom)}</td><td class="num">${N(f.fab)}</td><td class="num">${N(f.ven)}</td><td class="num"><b>${N(f.reste)}</b></td><td class="num">${F(f.valeur)}</td><td>${f.reste<0?'<span class="pill bad">Vendus > fabriqués</span>':f.reste===0?'<span class="pill">Épuisé</span>':''}</td></tr>`).join('')}</tbody></table></div>`:`<div class="tw"><div class="empty"><b>Aucun produit</b>Créez votre catalogue dans « Produits &amp; prix ».</div></div>`}
  <h3 style="margin-top:22px">Bobines en stock par type de sac</h3>
  ${bobinesParSac()}
  <h3 style="margin-top:22px">Autres fournitures</h3>
  ${fournTable()}
  <p class="note">Si un chiffre est négatif, une production, un conteneur ou un achat n'a probablement pas été saisi.</p>`;
}
function vProduits(){
  const cfg = config();
  return `<div class="head"><div><h2>Produits &amp; prix</h2><p class="lead">Pour chaque sac : le poids de papier, la colle, le coût d'impression et votre prix de vente. Le prix de revient se calcule à partir de vos achats et de vos charges.</p></div><div class="sp"></div>${S.produits.length?'':'<button class="btn" data-act="seed">Créer le catalogue de base</button>'}<button class="btn primary" data-add="produits">${ico('plus')}Ajouter</button></div>
  ${S.produits.some(p=>p.exemple)?`<div class="banner">Les poids marqués <span class="pill warn">exemple</span> sont des valeurs de départ. Pesez vos sacs et corrigez-les : tout le calcul du prix de revient en dépend.</div>`:''}
  ${listBlock('produits')}
  <div class="grid two" style="margin-top:22px">
    <div class="panel"><h3>Alertes de stock</h3><p class="note">Recevez un avertissement sur le tableau de bord quand la matière passe sous ces seuils.</p>
      <div class="fields"><div class="field"><label for="seuil_kraft">Papier kraft (kg)</label><input id="seuil_kraft" type="number" inputmode="decimal" value="${esc(cfg.seuil_kraft||'')}"></div>
      <div class="field"><label for="seuil_colle">Colle (kg)</label><input id="seuil_colle" type="number" inputmode="decimal" value="${esc(cfg.seuil_colle||'')}"></div></div>
      <div class="sheetbar"><button class="btn" data-act="seuils">Enregistrer les seuils</button></div></div>
    <div class="panel"><h3>Sauvegarde</h3><p class="note">Téléchargez toutes vos données dans un fichier, ou restaurez une sauvegarde.</p>
      <div class="sheetbar"><button class="btn" data-act="export">Télécharger une sauvegarde</button><button class="btn" data-act="csv">Ventes en tableur (CSV)</button>
      <label class="btn" for="imp">Restaurer une sauvegarde</label><input id="imp" type="file" accept=".json,application/json" hidden></div></div>
    ${vEquipe()}
  </div>`;
}

// ---------- Formulaire ----------
let form = null;
function openForm(col, id, preset){
  const sc = SCHEMAS[col]; const rec = id ? {...S[col].find(r=>r.id===id)} : {};
  if (!id) sc.fields.forEach(f => { if (f.def !== undefined) rec[f.k] = typeof f.def === 'function' ? f.def() : f.def; });
  Object.assign(rec, preset||{});
  if (col==='produits' && !num(rec.prix_lot) && pvSac(rec)) rec.prix_lot = pvLot(rec);
  if (col==='ventes') { if (rec.prix_lot === undefined && num(rec.prix_unitaire)) rec.prix_lot = +(num(rec.prix_unitaire)*LOT).toFixed(2); if (rec.lots === undefined && num(rec.quantite)) rec.lots = +(num(rec.quantite)/LOT).toFixed(3); }
  form = {col, id, v:rec, manual:new Set(id?['kraft_kg','colle_kg','prix_unitaire'].concat(num(rec.g_papier)?['g_papier']:[], num(rec.g_colle)?['g_colle']:[]):[])};
  drawForm();
}
function fieldHtml(f, v){
  const val = v[f.k] ?? ''; const id = 'f_'+f.k; const req = f.req ? ' <span style="color:var(--bad)">*</span>' : '';
  let input;
  if (f.type==='select') input = `<select id="${id}" data-k="${f.k}">${f.options.map(([k,l])=>`<option value="${k}" ${String(val)===k?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  else if (f.type==='product') input = `<select id="${id}" data-k="${f.k}"><option value="">Choisir…</option>${Object.entries(CATS).map(([c,l])=>{const ps=sortedProds().filter(p=>p.categorie===c); return ps.length?`<optgroup label="${l}">${ps.map(p=>`<option value="${esc(p.id)}" ${val===p.id?'selected':''}>${esc(p.nom)}${dims(p)?' ('+dims(p)+' cm)':''}</option>`).join('')}</optgroup>`:''}).join('')}</select>`;
  else if (f.type==='client') input = `<select id="${id}" data-k="${f.k}"><option value="">Choisir…</option>${[...S.clients].sort((a,b)=>String(a.nom).localeCompare(b.nom,'fr')).map(c=>`<option value="${esc(c.id)}" ${val===c.id?'selected':''}>${esc(c.nom)}</option>`).join('')}${val&&!S.clients.some(c=>c.id===val)?`<option value="${esc(val)}" selected>${esc(lastClient||'Nouveau client')}</option>`:''}<option value="__new">+ Nouveau client…</option></select>`;
  else if (f.type==='cliche') { const cl = [...S.cliches].filter(c => c.statut!=='archive' || c.id===val).sort((a,b)=>(a.client===form?.v?.client?0:a.genre==='standard'?1:2)-(b.client===form?.v?.client?0:b.genre==='standard'?1:2) || clicheNom(a).localeCompare(clicheNom(b),'fr'));
    input = `<select id="${id}" data-k="${f.k}"><option value="">Aucun (sac sans impression)</option>${cl.map(c=>`<option value="${esc(c.id)}" ${val===c.id?'selected':''}>${esc(clicheNom(c))} : ${esc(c.logo)}</option>`).join('')}</select>`; }
  else if (f.type==='container') input = `<select id="${id}" data-k="${f.k}"><option value="">—</option>${[...S.conteneurs].sort((a,b)=>String(b.date).localeCompare(a.date)).map(c=>`<option value="${esc(c.id)}" ${val===c.id?'selected':''}>${esc(c.reference)} (${fdate(c.date)})</option>`).join('')}</select>`;
  else if (f.type==='article') { const noms = [...new Set(ARTICLES.concat(S.fournitures.map(x=>String(x.article||'').trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,'fr'));
    input = `<input id="${id}" data-k="${f.k}" list="${id}_l" autocomplete="off" value="${esc(val)}"><datalist id="${id}_l">${noms.map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist>`; }
  else if (f.type==='textarea') input = `<textarea id="${id}" data-k="${f.k}">${esc(val)}</textarea>`;
  else input = `<input id="${id}" data-k="${f.k}" type="${f.type==='number'?'number':f.type}" ${f.type==='number'?'inputmode="decimal" step="any"':''} value="${esc(val)}">`;
  const hidden = f.k==='taux' && (!v.devise || v.devise==='FCFA');
  return `<div class="field ${f.full||f.type==='textarea'?'full':''}" ${hidden?'hidden':''}><label for="${id}">${f.label}${req}</label>${input}${f.h?`<span class="h">${f.h}</span>`:''}</div>`;
}
function drawForm(err){
  if (!form) { $('#layer').innerHTML = ''; return; }
  const sc = SCHEMAS[form.col];
  $('#layer').innerHTML = `<div class="ov" data-close="1"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(sc.title)}">
    <h3 style="display:flex;align-items:center;gap:10px"><span style="flex:1"><span class="note" style="display:block;font:500 12px var(--f-body)">${form.id?'Modifier':'Nouvelle saisie'}</span>${esc(sc.title)}</span><button class="iconbtn" type="button" data-close="1" aria-label="Fermer">${ico('x')}</button></h3>
    <form id="frm" novalidate><div class="fields">${sc.fields.map(f=>fieldHtml(f,form.v)).join('')}<div class="calc" id="calc" ${sc.calc?'':'hidden'}></div></div>
    ${err?`<div class="err">${esc(err)}</div>`:''}
    <div class="sheetbar"><button class="btn primary" type="submit">Enregistrer</button><button class="btn" type="button" data-close="1">Annuler</button><div class="sp"></div>
    ${form.id?`<button class="btn danger" type="button" data-del="${form.col}" data-id="${esc(form.id)}">Supprimer</button>`:''}</div></form></div></div>`;
  drawCalc();
  const first = $('#frm [data-k]'); if (first && !err) setTimeout(()=>first.focus({preventScroll:true}),30);
}
function drawCalc(){
  const sc = SCHEMAS[form.col]; if (!sc.calc) return;
  $('#calc').innerHTML = sc.calc(form.v).map(([l,v,c])=>`<div class="${c||''}"><span>${l}</span><span>${v}</span></div>`).join('');
}
function onFormInput(e){
  const k = e.target.dataset.k; if (!k || !form) return;
  if (e.target.value === '__new') { e.target.value=''; openSub(); return; }
  form.v[k] = e.target.value;
  if (['kraft_kg','colle_kg','prix_unitaire','g_papier','g_colle'].includes(k)) form.manual.add(k);
  const sc = SCHEMAS[form.col];
  if (sc.auto) { const up = sc.auto(form.v, k); Object.entries(up).forEach(([kk,vv]) => { if (form.manual.has(kk) && k!=='produit') return; form.v[kk] = vv; const el = document.getElementById('f_'+kk); if (el) el.value = vv; }); }
  if (k==='devise') { const t = document.getElementById('f_taux'); if (t) t.closest('.field').hidden = e.target.value==='FCFA'; }
  drawCalc();
}
// petit formulaire client dans une vente
let pending = null, lastClient = '';
function openSub(){ pending = {...form}; form = {col:'clients', id:null, v:{type:'boulangerie'}, manual:new Set(), back:true}; drawForm(); }
async function submit(){
  const sc = SCHEMAS[form.col];
  const miss = sc.fields.filter(f => f.req && (form.v[f.k]===undefined || String(form.v[f.k]).trim()==='')).map(f=>f.label);
  if (form.col==='cliches' && form.v.genre!=='standard' && !form.v.client) miss.push('Client (ou choisissez « Standard »)');
  if (form.col==='conteneurs' && form.v.devise && form.v.devise!=='FCFA' && !num(form.v.taux)) miss.push('Taux de change');
  if (miss.length) return drawForm('À compléter : ' + miss.join(', ') + '.');
  if (form.col==='electricite' && form.v.fin < form.v.debut) return drawForm('La date de fin doit être après la date de début.');
  const rec = {...form.v}; sc.fields.forEach(f => { if (f.type==='number' && rec[f.k]!==undefined && rec[f.k]!=='') rec[f.k] = num(rec[f.k]); });
  if (form.id) rec.id = form.id;
  if (form.col==='produits' && form.id) delete rec.exemple;
  if (form.col==='produits') rec.prix_vente = num(rec.prix_lot)/LOT;
  if (form.col==='ventes') rec.prix_unitaire = num(rec.prix_lot)/LOT;
  try {
    const nid = await save(form.col, rec);
    toast('Enregistré');
    if (form.back && pending) { lastClient = rec.nom; form = pending; pending = null; form.v.client = nid; setTimeout(drawForm, 60); return; }
    form = null; drawForm();
  } catch(e){ drawForm(e && e.code==='quota_exceeded' ? 'Espace de stockage plein. Supprimez d\'anciennes lignes.' : "L'enregistrement a échoué. Vérifiez la connexion puis réessayez."); }
}

// ---------- Actions ----------
const SEED = [
  // dimensions données par ECOSAC : longueur × largeur × côté (cm)
  ['Sac 1 croissant','croissant',1,21,10,6,0.3],
  ['Sac 2 croissants','croissant',2,21,12,8,0.35],
  ['Sac 4 et 5 croissants','croissant',4,28,16,5,0.45],
  ['Sac chawarma','chawarma',10,27,10,6,0.35],
  ['Sac 1 pain','pain',20,40,10,6,0.5],
  ['Sac 2 et 3 pains','pain',21,40,12,8,0.55],
  ['Sac 5 pains','pain',22,40,28,8,0.8],
].map(([nom,categorie,ordre,longueur,largeur,cote,g_colle]) => ({nom,categorie,ordre,longueur,largeur,cote,grammage:40,g_papier:+estimePapier({longueur,largeur,cote,grammage:40}).g.toFixed(1),g_colle,cout_impression:0}))
.concat([
  {nom:'Sac shopping kraft sans impression', categorie:'shopping', ordre:30, g_papier:60, g_colle:2, cout_impression:0},
  {nom:'Sac shopping kraft impression personnalisée', categorie:'shopping', ordre:31, g_papier:60, g_colle:2, cout_impression:25},
]).map(p => ({...p, prix_vente:0, exemple:true, notes: p.longueur ? 'Grammage 40 g/m² supposé : à corriger' : 'Valeurs d\'exemple : à corriger avec vos mesures'}));
async function seed(){
  if (S.produits.length) return toast('Le catalogue existe déjà');
  try { await saveMany(SEED.map(p => ['produits', p])); toast('Catalogue créé. Corrigez les poids et les prix.'); tab='produits'; location.hash='produits'; render(); }
  catch(e){ toast("La création a échoué. Réessayez."); }
}
async function saveSeuils(){
  try { await save('parametres', {...config(), id:'config', seuil_kraft:num($('#seuil_kraft').value), seuil_colle:num($('#seuil_colle').value)}); toast('Seuils enregistrés'); } catch(e){ toast('Échec de l\'enregistrement'); }
}
async function exportJSON(){
  const data = {app:'ECOSAC Gestion', version:1, date:new Date().toISOString()}; COLS.forEach(c => data[c] = S[c]);
  try { await downloads.save({filename:`ecosac-sauvegarde-${today()}.json`, data: JSON.stringify(data,null,1)}); } catch(e){ if (e && e.code !== 'dismissed') toast('Téléchargement annulé'); }
}
async function exportCSV(){
  const q = s => '"'+String(s??'').replace(/"/g,'""')+'"';
  const lines = [['Date','Client','Produit','Sacs','Prix par sac','Total','Payé','Reste','Mode'].join(';')].concat(
    [...S.ventes].sort((a,b)=>String(a.date).localeCompare(b.date)).map(v => { const t = num(v.quantite)*num(v.prix_unitaire);
      return [v.date, q(clientNom(v.client)), q(prodNom(v.produit)), num(v.quantite), num(v.prix_unitaire), t, num(v.montant_paye), t-num(v.montant_paye), v.paiement||''].join(';'); }));
  try { await downloads.save({filename:`ecosac-ventes-${today()}.csv`, data:'﻿'+lines.join('\n')}); } catch(e){}
}
async function importJSON(file){
  try {
    const d = JSON.parse(await file.text()); if (d.app !== 'ECOSAC Gestion') throw 0;
    const items = []; for (const c of COLS) for (const r of (d[c]||[])) { if (r && r.id) items.push([c, r]); } await saveMany(items); const n = items.length;
    toast(`${n} lignes restaurées`);
  } catch(e){ toast("Ce fichier n'est pas une sauvegarde ECOSAC valide"); }
}
let tt; function toast(t){ clearTimeout(tt); let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className='toast'; el.setAttribute('role','status'); document.body.appendChild(el); } el.textContent = t; tt = setTimeout(()=>el.remove(), 2600); }

function askDelete(col, id, host){
  host.innerHTML = `<span class="confirm">Supprimer ?<button class="btn small danger" data-confirm="${col}" data-id="${esc(id)}">Oui</button><button class="btn small" data-cancel="1">Non</button></span>`;
}
document.addEventListener('click', async e => {
  const t = e.target.closest('button,[data-close],[data-act],a[href^="#"]'); if (!t) return;
  const d = t.dataset;
  if (d.goq) { $('#layer').innerHTML=''; tab = d.goq; try { history.replaceState(null,'','#'+tab); } catch(_){} render(); scrollTo({top:0}); return; }
  if (d.qadd) { const c = d.qadd; $('#layer').innerHTML=''; return openForm(c); }
  if (d.act==='quick') return openQuick();
  if (d.act==='closeq') { if (e.target===t || t.tagName==='BUTTON') $('#layer').innerHTML=''; return; }
  if (d.act==='menu') { document.body.classList.toggle('menu'); return; }
  if (d.act==='closemenu') { document.body.classList.remove('menu'); return; }
  if (d.act==='demo-toggle') return demo ? stopDemo() : startDemo();
  if (d.per) { per = d.per; try { localStorage.setItem(LS+'-per', per); } catch(_){} render(); return; }
  if (d.tab) { e.preventDefault(); tab = d.tab; try { history.replaceState(null,'','#'+tab); } catch(_){ location.hash = tab; } render(); scrollTo({top:0}); return; }
  if (d.go) { tab = d.go; location.hash = tab; render(); return; }
  if (d.close && (e.target === t)) { form = null; pending = null; drawForm(); return; }
  if (d.sub) { e.preventDefault(); sub[d.sub] = d.val; if (t.tagName==='A') { tab = d.sub; try { history.replaceState(null,'','#'+tab); } catch(_){} } render(); return; }
  if (d.add) return openForm(d.add);
  if (d.edit) return openForm(d.edit, d.id);
  if (d.del) {
    if (form) { const bar = t.parentElement; t.outerHTML = `<span class="confirm">Supprimer ?<button class="btn small danger" type="button" data-confirm="${d.del}" data-id="${esc(d.id)}">Oui</button><button class="btn small" type="button" data-cancel="form">Non</button></span>`; return; }
    return askDelete(d.del, d.id, t.parentElement);
  }
  if (d.confirm) { try { await remove(d.confirm, d.id); toast('Supprimé'); } catch(_){ toast('La suppression a échoué'); } form = null; drawForm(); render(); return; }
  if (d.cancel) { if (d.cancel==='form') drawForm(); else render(); return; }
  if (d.act==='seed') return seed();
  if (d.act==='demo') return startDemo();
  if (d.act==='stopdemo') return stopDemo();
  if (d.act==='seuils') return saveSeuils();
  if (d.act==='export') return exportJSON();
  if (d.act==='marges-save') return margesSave();
  if (d.act==='marges-reset') return margesSave(true);
  if (d.act==='cx-save') return cxSave();
  if (d.act==='cx-load') return cxLoad(d.id);
  if (d.act==='cx-new') { CX = {...CX_DEF}; CXm = null; try { localStorage.removeItem(LS+'-calc'); } catch(_){} render(); return; }
  if (d.act==='logout') { if (demo) stopDemo(); return sb.auth.signOut(); }
  if (d.act==='auth') return showAuth(d.k);
  if (d.act==='recheck') return user && enter(user);
  if (d.act==='ajouter-membre') return ajouterMembre();
  if (d.act==='retirer') return retirerMembre(d.uid);
  if (d.act==='csv') return exportCSV();
});
document.addEventListener('input', e => {
  if (e.target.id==='qinput') { qFilter(e.target.value); return; }
  if (e.target.closest && e.target.closest('.calc-grid') && e.target.tagName!=='SELECT') { onCalcInput(e); return; }
  if (e.target.dataset && e.target.dataset.q) { const c = e.target.dataset.q; q[c] = e.target.value; const rows = searched(c); $('#tbl-'+c).innerHTML = table(c, rows); $('#cnt-'+c).textContent = N(rows.length)+' ligne'+(rows.length>1?'s':''); return; }
  if (e.target.closest('#frm') && e.target.tagName!=='SELECT') onFormInput(e); });
document.addEventListener('change', e => {
  if (e.target.closest('#frm')) { if (e.target.tagName==='SELECT') onFormInput(e); return; }
  if (e.target.closest('.calc-grid') && e.target.tagName==='SELECT') { onCalcInput(e); return; }
  if (e.target.id==='per') { per = e.target.value; try { localStorage.setItem(LS+'-per', per); } catch(_){} render(); }
  if (e.target.dataset.filtre) { filtreCol[e.target.dataset.filtre] = e.target.value; render(); }
  if (e.target.id==='imp' && e.target.files[0]) importJSON(e.target.files[0]);
});
document.addEventListener('submit', e => { if (e.target.id==='frm') { e.preventDefault(); submit(); } if (e.target.id==='authf') { e.preventDefault(); authSubmit(); } });
document.addEventListener('keydown', e => {
  if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); if ($('.qmenu')) $('#layer').innerHTML=''; else openQuick(); return; }
  if ($('.qmenu') && ['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Enter'].includes(e.key)) { const v = qVisible(); const i = v.findIndex(b=>b.classList.contains('on'));
    if (e.key==='Enter') { e.preventDefault(); v[i]?.click(); return; } e.preventDefault(); qSel(i + (e.key==='ArrowDown'||e.key==='ArrowRight' ? 1 : -1)); return; }
}, true);
document.addEventListener('mouseover', e => { const t = e.target.closest && e.target.closest('[data-tip]'); const tip = $('#tip'); if (!t) { tip.hidden = true; return; } tip.innerHTML = t.dataset.tip; tip.hidden = false; });
document.addEventListener('mousemove', e => { const tip = $('#tip'); if (tip.hidden) return; const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = x+'px'; tip.style.top = y+'px'; });
addEventListener('scroll', () => { $('#tip').hidden = true; }, {passive:true});
document.addEventListener('keydown', e => { if (e.key==='Escape') { if (form) { form=null; pending=null; drawForm(); } else if ($('.qmenu')) $('#layer').innerHTML=''; document.body.classList.remove('menu'); } });
// clic sur une ligne = modifier
document.addEventListener('click', e => { if (e.defaultPrevented) return; const tr = e.target.closest('tr[data-open]'); if (!tr || e.target.closest('button,a,input,select,.actions')) return; openForm(tr.dataset.open, tr.dataset.id); });
paintIcons();

drawTabs(); boot();
})();
