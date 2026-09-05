'use strict';

// ══════════════════════════════════════════════════
//  CONFIGURATION
//
//  LE CODE ANIMATEUR N'EST PLUS ICI.
//
//  Il y était en clair — `const ADMIN_CODE = '…'` — dans un fichier servi
//  publiquement : n'importe quel participant qui ouvrait la source de la
//  page pouvait ouvrir la console d'animation, changer d'acte, ou vider
//  les votes en pleine séance. Un code écrit côté client ne protège rien.
//
//  Il vit maintenant dans une table privée de Supabase et n'est comparé
//  que par la base, à travers trois fonctions `security definer` :
//  admin_set_state, admin_reset et admin_feedback. Le code voyage, il ne
//  se stocke pas ; aucun fichier de ce dépôt ne le contient.
//
//  Marche à suivre pour l'installer : SECURITE-SUPABASE.sql, en tête.
// ══════════════════════════════════════════════════


// ══════════════════════════════════════════════════
//  ÉTAPES
//  Chaque objet = une étape du jeu.
//
//  Champs obligatoires :
//    title  , numéro affiché (ex. "Étape 1")
//    sub    , sous-titre court (ex. "Découverte du CV")
//    when   , marqueur temporel (ex. "Lundi 5 février")
//    q      , question de vote commune aux deux rôles
//    min/max, libellés des extrémités de l'échelle Likert
//    biais  , nom du biais cognitif
//    baisDef, définition courte du biais
//    biaisC , explication du biais côté candidat (Mehdi)
//    biaisR , explication du biais côté recruteur (Sophie)
//
//  Champs optionnels :
//    qC, question spécifique au candidat (si différente de q)
//    qR, question spécifique au recruteur (si différente de q)
// ══════════════════════════════════════════════════

const STEPS = [
  {
    title: 'Acte 1',
    sub:   'Découverte du CV',
    when:  'Lundi 5 février, 14h12',
    q:     'Ce CV est-il convaincant pour le poste ?',
    qC:    'Votre CV vous semble-t-il convaincant pour ce poste ?',
    qR:    'Trouvez-vous ce CV convaincant pour le poste ?',
    min:   'Pas du tout convaincant',
    max:   'Tout à fait convaincant',
    biais:    'Biais de saillance',
    baisDef:  "Notre attention se focalise sur l'élément le plus visible et lui accorde un poids décisif, au détriment d'informations plus pertinentes mais moins frappantes.",
    biaisC:   "Vous connaissez la valeur de votre bénévolat, 18 mois d'engagement réel, des résultats mesurables. Le trou d'un mois est une virgule dans votre histoire.",
    biaisR:   "Le trou visuel dans la chronologie attire immédiatement l'œil et active le souvenir du candidat précédent. Même si tout le reste est solide, c'est cette absence qui reste.",
  },
  {
    title: 'Acte 2',
    sub:   'Le trou dans le CV',
    when:  "Vendredi 9 février, entretien RH n°2",
    q:     "Cet échange a-t-il permis de clarifier la situation ?",
    qC:    "Cet échange a-t-il permis de clarifier votre situation ?",
    qR:    "Cet échange vous a-t-il permis de clarifier la situation ?",
    min:   'Pas du tout clarifié',
    max:   'Totalement clarifié',
    biais:    'Effet Pygmalion',
    baisDef:  "Les attentes qu'on a envers quelqu'un modifient inconsciemment notre comportement, et provoquent chez l'autre exactement la réaction qu'on redoutait.",
    biaisC:   "Vous sentez la méfiance dans le ton de Sophie. Ça vous ferme. Vous avez peur de dire la vérité, pas parce que vous avez quelque chose à cacher, mais parce que vous savez qu'on ne vous croira pas.",
    biaisR:   "Votre méfiance a durci votre ton sans que vous le réalisiez. Mehdi a senti le jugement et s'est refermé. Vous avez obtenu exactement ce que vous craigniez, et interprété sa fermeture comme une confirmation.",
  },
  {
    title: 'Acte 3',
    sub:   'La décision de recrutement',
    when:  "Mercredi 14 février, 17h43",
    q:     'Cette décision est-elle la bonne ?',
    qC:    "Votre décision de signer chez ComStudio vous semble-t-elle la bonne ?",
    qR:    "Cette décision de recruter Mehdi vous semble-t-elle la bonne ?",
    min:   'Mauvaise décision',
    max:   'Bonne décision',
    biais:    'Rationalisation',
    baisDef:  "Après avoir pris une décision sous contrainte, on fabrique des justifications logiques pour réduire l'inconfort du doute, et se convaincre qu'on a bien fait.",
    biaisC:   "Vous avez choisi ComStudio en connaissance de cause, en renonçant à une autre offre. C'était un pari réfléchi, pas une fuite en avant.",
    biaisR:   "Vous avez dit oui sous pression, avec des réserves. À peine le contrat signé, vous avez commencé à construire des arguments pour vous convaincre, 'il a du potentiel', 'on verra bien', plutôt que d'admettre votre doute.",
  },
  {
    title: 'Acte 4',
    sub:   'Le premier jour',
    when:  "Lundi 4 mars, premier jour de Mehdi",
    q:     "Mehdi a-t-il pu démarrer son poste dans des conditions normales ?",
    qC:    "Avez-vous pu démarrer votre poste dans des conditions normales ?",
    qR:    "Mehdi a-t-il pu démarrer son poste dans des conditions normales ?",
    min:   'Aucunement',
    max:   'Totalement',
    biais:    "Erreur fondamentale d'attribution",
    baisDef:  "On explique le comportement des autres par ce qu'ils sont, pas par la situation dans laquelle ils se trouvent, et on s'exonère des conditions qu'on a créées.",
    biaisC:   "Vous avez tout fait pour vous montrer professionnel : arriver à l'heure, ne pas vous plaindre, vous rendre utile seul. Le problème, c'est l'organisation, pas vous.",
    biaisR:   "Vous avez posté un message de bienvenue, l'ordi était là, Thomas devait gérer. Si Mehdi a l'air perdu, votre premier réflexe n'est pas de remettre en cause l'onboarding.",
  },
  {
    title: 'Acte 5',
    sub:   "L'erreur de charte graphique",
    when:  "Jeudi 21 mars, 11h14",
    q:     'À qui revient la responsabilité de cette erreur ?',
    qC:    "À qui revient la responsabilité de cette erreur ?",
    qR:    "À qui revient la responsabilité de cette erreur ?",
    min:   'Entièrement à Mehdi',
    max:   "Entièrement à l'entreprise",
    biais:    'Malédiction de la connaissance',
    baisDef:  "Une fois qu'on sait quelque chose, on ne peut plus imaginer ne pas le savoir, et on oublie que les autres partent d'un état de connaissance différent.",
    biaisC:   "Vous avez utilisé le dossier 'Charte graphique' du drive partagé, le seul que vous connaissiez. Personne ne vous a dit qu'il en existait un autre. Comment auriez-vous pu savoir ?",
    biaisR:   "L'email de mise à jour avait été envoyé à toute l'équipe. Le drive était à jour. Pour vous, l'information était là, vous ne réalisez pas immédiatement que Mehdi n'existait pas encore dans l'entreprise à ce moment-là.",
  },
  {
    title: 'Acte 6',
    sub:   "Fin de période d'essai",
    when:  "Vendredi 3 mai, deux mois plus tard",
    q:     "Cette évaluation de fin de période d'essai est-elle juste ?",
    qC:    "L'évaluation que vous recevez vous semble-t-elle juste ?",
    qR:    "L'évaluation que vous portez vous semble-t-elle juste ?",
    min:   'Totalement injuste',
    max:   'Totalement juste',
    biais:    'Biais rétrospectif + ancrage',
    baisDef:  "Un événement marquant déforme le jugement global, et on réinterprète tout le passé à sa lumière, en croyant l'avoir 'su depuis le début'.",
    biaisC:   "On vous reproche un 'manque d'initiative' sans un seul exemple concret. Quand vous avez demandé lequel, on vous a dit 'vous auriez dû le sentir'. Comment être jugé sur des règles implicites que personne ne vous a données ?",
    biaisR:   "L'incident de la charte a ancré une image. En relisant 2 mois d'échanges, tout s'éclaire : jamais de proposition spontanée, jamais d'alerte proactive. Les doutes du début semblent confirmés, comme si c'était évident depuis le premier jour.",
  },
];


// ══════════════════════════════════════════════════
//  CONTEXTES PARTICIPANT
//  CTX.c[i] = texte affiché au candidat à l'étape i
//  CTX.r[i] = texte affiché au recruteur à l'étape i
//
//  Règle de rédaction : faits uniquement, jamais d'interprétation
//  ni de ressenti. Le biais doit naître chez le participant.
// ══════════════════════════════════════════════════

const CTX = {
  c: [
    // Acte 1, CV
    "Votre CV affiche 14 mois chez Lumeo, un mois non renseigné en décembre 2021, puis 18 mois bénévoles chez Passerelle. À Lumeo, votre manager direct vous tenait régulièrement responsable de ses propres erreurs en réunion d'équipe. Vous êtes parti après une ultime injustice, sans rien pouvoir prouver. Vous savez que ce trou d'un mois va attirer l'œil. Vous espérez qu'on vous laisse l'expliquer.",
    // Acte 2, Entretien
    "Vous avez démissionné de Lumeo après 14 mois. Votre manager vous attribuait ses erreurs en réunion, plusieurs fois par semaine, et critiquait votre travail devant les clients. La dernière injustice a été la goutte d'eau. Vous n'avez ni email, ni témoin, ni preuve concrète. C'est le deuxième entretien chez ComStudio. Sophie revient sur les raisons de votre départ et insiste. Vous savez que parler de tout ça sans preuve va sonner comme une excuse facile.",
    // Acte 3, Décision
    "Vous avez 48h pour répondre à l'offre ComStudio. Ce matin, une seconde proposition est arrivée d'une grande agence internationale : 200€ de plus par mois, processus plus rapide, équipe plus grosse. ComStudio est un studio de taille moyenne, projet plus exposé, possibilité de prendre des initiatives sur du concret. Vous n'avez pas tenté de négocier le salaire avec ComStudio. Vous signez ComStudio le soir même.",
    // Acte 4, Premier jour
    "Premier jour. 9h17, vous êtes au bureau 12. L'ordinateur est éteint, le badge posé sur le clavier, aucune session ne s'ouvre. Votre manager Thomas est en réunion et a reporté votre point d'accueil de 11h à demain. Personne ne vient vous voir. Vous déjeunez seul. L'après-midi, sans accès aux outils, vous lisez les anciennes publications de ComStudio et préparez des questions. À 17h52, vous postez un message Slack pour signaler ce qu'il vous manque. Personne ne répond. Vous rentrez chez vous.",
    // Acte 5, Charte graphique
    "Premier livrable, trois semaines après votre arrivée : un visuel pour la Fondation Espoir, partenaire majeur de ComStudio. Vous avez passé trois jours dessus. Vous utilisez les fichiers du dossier « Charte graphique » sur le drive partagé, le seul qu'on vous a montré lors de la prise en main. Aucune mention d'une version mise à jour, aucun signalement d'un autre dossier, aucune relecture demandée avant envoi. Vous envoyez le fichier au client.",
    // Acte 6, Bilan
    "Thomas vous remet votre évaluation de fin de période d'essai. Notes basses sur « autonomie/initiative » et « maîtrise des outils ». Il évoque un « manque d'initiative ». Vous demandez un exemple concret. Il répond : « vous auriez dû le sentir ». Vous avez exécuté toutes les tâches confiées, dans les délais, sans plainte. Aucun objectif de prise d'initiative spontanée ne vous avait été formulé. Aucun retour intermédiaire ne vous avait alerté pendant ces deux mois.",
  ],
  r: [
    // Acte 1, CV
    "Le poste de chargé de communication est ouvert depuis 4 mois. Il y a 4 mois, vous avez recruté un profil au parcours très similaire, trou de CV inclus. Ce collaborateur a démissionné au bout de 3 semaines, sans préavis, en pleine campagne client. Vous avez géré la crise pendant trois jours et perdu la confiance du client concerné. Votre direction veut un recrutement bouclé cette semaine. Vous regardez désormais les périodes non renseignées avec une attention particulière.",
    // Acte 2, Entretien
    "Votre grille d'évaluation interne demande au candidat de nommer la raison de son départ précédent, en quelques mots clairs. Vous avez 3 autres candidats en attente d'un retour. Votre N+1 attend un nom signé cette semaine. C'est la deuxième fois que vous recevez Mehdi. Lors du premier entretien, il avait évoqué un « changement de cap professionnel » sans plus de détail. Vous voulez aujourd'hui une réponse précise.",
    // Acte 3, Décision
    "Votre N+1 a tranché en réunion : « on prend Mehdi ou on ferme le poste jusqu'en septembre ». Dans votre compte-rendu post-entretien, vous aviez consigné trois réserves, dont « manque de transparence sur le départ précédent ». Le contrat est validé le soir même. Pas de deuxième entretien programmé. Pas de prise de références auprès de Lumeo ou de Passerelle. Pas de test métier réalisé.",
    // Acte 4, Premier jour
    "Vous êtes en comité de direction toute la matinée, puis sur un déjeuner client toute l'après-midi. Thomas, manager direct de Mehdi, avait reçu pour mission de gérer l'arrivée et le point d'accueil. Vous avez posté un message de bienvenue à 9h02 sur Slack. À 18h, en quittant le bureau, vous apprenez par un collègue que Mehdi est rentré sans avoir eu accès à un seul outil de la journée. Thomas vous expliquera plus tard qu'il pensait que les accès se créaient automatiquement à la signature du contrat.",
    // Acte 5, Charte graphique
    "La Fondation Espoir est votre plus gros partenaire : 40 000€ de contrat annuel, renégociation dans 3 semaines. Le 15 janvier, un email équipe annonçait la nouvelle charte graphique avec la mention explicite « merci d'archiver l'ancienne version ». Mehdi a été recruté le 14 février et a pris son poste le 4 mars : il n'a jamais reçu cet email. Le drive partagé contient encore les deux dossiers côte à côte, sans aucune signalétique de version, et personne ne l'a relu avant envoi.",
    // Acte 6, Bilan
    "Vous relisez 2 mois d'échanges Slack et mail avec Mehdi avant le point de fin de période d'essai. Vous notez qu'il n'a jamais proposé d'idée spontanément, jamais alerté sur un problème avant qu'il devienne urgent, jamais initié de contact hors des réunions planifiées. L'incident de la charte graphique du 21 mars revient régulièrement dans les conversations d'équipe. Pour un poste de chargé de communication, la proactivité fait partie des attendus fondamentaux du métier.",
  ],
};


// ══════════════════════════════════════════════════
//  DOCUMENTS PROJETÉS
//  DOC_PATHS[i] = chemin du fichier HTML pour l'étape i.
//  Chargés dynamiquement via fetch() — modifiables dans docs/.
// ══════════════════════════════════════════════════

const DOC_PATHS = [
  'docs/acte1-cv.html',
  'docs/acte2-entretien.html',
  'docs/acte3-email-offre.html',
  'docs/acte4-slack.html',
  'docs/acte5-email-charte.html',
  'docs/acte6-evaluation.html',
];

/* ── Legacy inline DOCS (conservé en fallback) ── */
const DOCS = [

/* ── Acte 1 : CV ── */
`<div class="doc doc-paper">
  <div class="cv-header" data-anim-row>
    <div class="cv-name">MEHDI ARIF</div>
    <div class="cv-title">Chargé de communication</div>
    <div class="cv-contact">mehdi.arif@email.com &nbsp;·&nbsp; 06 XX XX XX XX &nbsp;·&nbsp; Paris 75011</div>
  </div>
  <div class="cv-section">
    <div class="cv-section-title" data-anim-row>Expériences professionnelles</div>
    <div class="cv-job" data-anim-row>
      <div class="cv-job-top"><strong>Chargé de communication, Agence Lumeo, Paris</strong><span class="cv-date">Sept. 2020 – Nov. 2021 · 14 mois</span></div>
      <ul>
        <li>Gestion des réseaux sociaux (45 000 abonnés cumulés)</li>
        <li>Production de contenus print et digitaux</li>
        <li>Coordination avec les équipes créatives</li>
      </ul>
    </div>
    <p style="font-size:.78rem;color:oklch(0.58 0.01 270);font-style:italic;padding:3px 12px;margin:2px 0">▸ Décembre 2021, période de transition</p>
    <div class="cv-job" data-anim-row>
      <div class="cv-job-top"><strong>Bénévole Communication, Association Passerelle, Paris</strong><span class="cv-date">Janv. 2022 – Juin 2023 · 18 mois</span></div>
      <ul>
        <li>Refonte du site web et des supports de communication</li>
        <li>Animation des réseaux sociaux (+200 % d'engagement)</li>
        <li>Relation presse : 3 articles obtenus</li>
      </ul>
    </div>
  </div>
  <div class="cv-section" data-anim-row>
    <div class="cv-section-title">Formation</div>
    <p>Licence Information-Communication, Université Lyon 2</p>
    <p>Formation "Community Management", OpenClassrooms (2022)</p>
  </div>
  <div class="cv-section" data-anim-row>
    <div class="cv-section-title">Compétences</div>
    <p>Canva &nbsp;·&nbsp; Adobe Suite &nbsp;·&nbsp; Meta Business Suite &nbsp;·&nbsp; Notion &nbsp;·&nbsp; Mailchimp</p>
  </div>
</div>`,

/* ── Acte 2 : Extrait d'entretien ── */
`<div class="doc doc-paper">
  <div class="transcript-header">
    <span>🎙 EXTRAIT D'ENTRETIEN, Enregistrement RH nº2</span>
    <span>Durée : 3 min 12</span>
  </div>
  <div class="transcript-body">
    <div class="tline tline-rh" data-anim-row><span class="tspk">Sophie</span><span class="ttxt">Sur votre CV, entre novembre 2021 et janvier 2022, je vois une période qui n'est pas renseignée. C'était quoi, cette période ?</span></div>
    <div class="tline tline-c" data-anim-row><span class="tspk">Mehdi</span><span class="ttxt">Oui, tout à fait. J'ai quitté l'agence Lumeo fin novembre et j'ai pris un peu de temps pour moi avant de m'engager chez Passerelle. C'était une transition voulue.</span></div>
    <div class="tline tline-rh" data-anim-row><span class="tspk">Sophie</span><span class="ttxt">D'accord. Et ce départ de Lumeo, c'était dans quelles circonstances ?</span></div>
    <div class="tline tline-c" data-anim-row><span class="tspk">Mehdi</span><span class="ttxt">C'était... une décision personnelle. Le poste ne correspondait plus à ce que je cherchais, disons. J'avais envie de m'investir différemment.</span></div>
    <div class="tline tline-rh" data-anim-row><span class="tspk">Sophie</span><span class="ttxt">Est-ce que vous pouvez m'en dire un peu plus sur ce qui n'allait pas ?</span></div>
    <div class="tline tline-c" data-anim-row><span class="tspk">Mehdi</span><span class="ttxt"><em>[silence, 3 secondes]</em>&nbsp; Disons que l'environnement de travail n'était pas idéal pour moi. Mais j'en tire des apprentissages, et c'est ce qui m'a amené vers le bénévolat ensuite.</span></div>
    <div class="tline tline-rh" data-anim-row><span class="tspk">Sophie</span><span class="ttxt">Très bien. Et chez Passerelle, c'était une expérience enrichissante ?</span></div>
    <div class="tline tline-c" data-anim-row><span class="tspk">Mehdi</span><span class="ttxt">Vraiment, oui. C'est là où j'ai le plus progressé, en fait.</span></div>
  </div>
</div>`,

/* ── Acte 3 : Email d'offre ── */
`<div class="doc doc-paper">
  <div class="email-meta" data-anim-row>
    <div class="email-row"><span class="email-lbl">De :</span><span>sophie.martin@comstudio.fr</span></div>
    <div class="email-row"><span class="email-lbl">À :</span><span>mehdi.arif@email.com</span></div>
    <div class="email-row"><span class="email-lbl">Objet :</span><strong>Offre de poste, Chargé de communication</strong></div>
    <div class="email-row"><span class="email-lbl">Date :</span><span>Mercredi 14 février, 17h43</span></div>
  </div>
  <div class="email-body">
    <p data-anim-row>Bonjour Mehdi,</p>
    <p data-anim-row>Suite à nos échanges, nous avons le plaisir de vous adresser une proposition formelle pour le poste de <strong>Chargé de communication</strong> au sein de ComStudio.</p>
    <div class="email-table" data-anim-row>
      <div class="email-tr"><span>Contrat</span><span>CDI, temps plein</span></div>
      <div class="email-tr"><span>Rémunération</span><span>2 400 € brut / mois</span></div>
      <div class="email-tr"><span>Prise de poste</span><span>Lundi 4 mars</span></div>
      <div class="email-tr"><span>Période d'essai</span><span>2 mois renouvelable une fois</span></div>
    </div>
    <p data-anim-row>Nous vous remercions de bien vouloir nous confirmer votre accord <strong>avant vendredi 16 février, 12h00</strong>. Passé ce délai, nous serions contraints de nous tourner vers d'autres candidatures.</p>
    <p data-anim-row>Dans l'attente de votre retour,<br><strong>Sophie Martin</strong><br><em>Responsable Ressources Humaines, ComStudio</em></p>
  </div>
</div>`,

/* ── Acte 4 : Slack premier jour ── */
`<div class="doc" style="padding:0;overflow:hidden;max-width:660px;width:100%">
  <div class="slack-topbar">💬 Slack, #général, Lundi 4 mars</div>
  <div class="slack-body">
    <div class="slack-msg" data-anim-row>
      <div class="slack-time">09:02</div>
      <div class="slack-content">
        <span class="slack-user">sophie.martin</span>
        <span class="slack-text">Bienvenue à Mehdi qui nous rejoint aujourd'hui en tant que chargé de com' ! 🎉</span>
        <span class="slack-react">👋 👋 🎉 😊</span>
      </div>
    </div>
    <div class="slack-msg" data-anim-row>
      <div class="slack-time">09:48</div>
      <div class="slack-content">
        <span class="slack-user">thomas.rey <em class="slack-badge">Manager</em></span>
        <span class="slack-text">Mehdi, désolé je suis en réunion jusqu'à 11h. Tu peux t'installer au bureau 12, l'ordi est configuré. Les accès arrivent dans la journée. On se fait un point à 11h si t'as des questions !</span>
        <span class="slack-react">·</span>
      </div>
    </div>
    <div class="slack-msg" data-anim-row>
      <div class="slack-time">12:31</div>
      <div class="slack-content">
        <span class="slack-user">thomas.rey <em class="slack-badge">Manager</em></span>
        <span class="slack-text">Finalement j'ai un déjeuner client, on reporte à demain matin 9h ?</span>
        <span class="slack-react">·</span>
      </div>
    </div>
    <div class="slack-msg slack-reply" data-anim-row>
      <div class="slack-time">12:34</div>
      <div class="slack-content">
        <span class="slack-user">mehdi.arif</span>
        <span class="slack-text">Pas de souci, à demain ! 👍</span>
      </div>
    </div>
    <div class="slack-note" data-anim-row>📷 &nbsp;Bureau 12, 09h17, ordinateur éteint, badge posé sur le clavier</div>
    <div class="slack-msg" style="margin-top:14px" data-anim-row>
      <div class="slack-time">17:52</div>
      <div class="slack-content">
        <span class="slack-user">mehdi.arif</span>
        <span class="slack-text">Bonsoir à tous. Petit point en fin de journée : je n'ai pas eu accès à la suite Adobe, ni au drive partagé, ni à ma boîte mail pro aujourd'hui. Pas de panique, je récupère tout ça demain matin avec Thomas. Bonne soirée !</span>
        <span class="slack-react" style="color:#bbb;font-style:italic;font-size:.72rem">aucune réponse</span>
      </div>
    </div>
  </div>
</div>`,

/* ── Acte 5 : Email réclamation charte ── */
`<div class="doc doc-paper">
  <div class="email-meta email-alert" data-anim-row>
    <div class="email-row"><span class="email-lbl">De :</span><span>contact@fondation-espoir.org</span></div>
    <div class="email-row"><span class="email-lbl">À :</span><span>thomas.rey@comstudio.fr</span></div>
    <div class="email-row"><span class="email-lbl">Cc :</span><span>sophie.martin@comstudio.fr</span></div>
    <div class="email-row"><span class="email-lbl">Objet :</span><strong>⚠️ Envoi avec ancienne identité visuelle</strong></div>
    <div class="email-row"><span class="email-lbl">Date :</span><span>Jeudi 21 mars, 11h14</span></div>
  </div>
  <div class="email-body">
    <p data-anim-row>Bonjour Thomas,</p>
    <p data-anim-row>Nous avons bien reçu les éléments envoyés hier par votre collaborateur <strong>Mehdi Arif</strong> concernant notre prochaine campagne de communication.</p>
    <p data-anim-row>Cependant, nous constatons que les visuels transmis utilisent votre <strong>ancienne charte graphique</strong> (logo et couleurs pré-janvier 2024), alors que nous avions déjà intégré votre nouvelle identité dans nos propres documents de travail.</p>
    <p data-anim-row>Pourriez-vous nous faire parvenir une version corrigée rapidement ? Nous avons une réunion de validation interne <strong>vendredi matin</strong>.</p>
    <p data-anim-row>Merci de votre compréhension.<br><strong>Isabelle Fontaine</strong><br><em>Chargée de partenariats, Fondation Espoir</em></p>
    <div class="email-attach" data-anim-row>📎 visuel_campagne_comstudio_v1.pdf &nbsp;<span style="color:#999;font-style:italic">— Logo version 2022 visible</span></div>
  </div>
</div>`,

/* ── Acte 6 : Évaluation fin de période d'essai ── */
`<div class="doc doc-paper">
  <div class="eval-top" data-anim-row>
    <div class="eval-confid">CONFIDENTIEL</div>
    <div class="eval-title">Évaluation, Fin de période d'essai</div>
    <div class="eval-meta">Mehdi Arif &nbsp;·&nbsp; Chargé de communication &nbsp;·&nbsp; Manager : Thomas Rey &nbsp;·&nbsp; 3 mai</div>
  </div>
  <div class="eval-grid">
    <div class="eval-row eval-head" data-anim-row><span>Critère</span><span>Note</span><span>Commentaire</span></div>
    <div class="eval-row" data-anim-row><span>Qualité du travail</span><span class="estars">●●●○○</span><span>"Exécution correcte, l'incident charte du 21 mars interroge"</span></div>
    <div class="eval-row" data-anim-row><span>Respect des délais</span><span class="estars">●●●●○</span><span>"Ponctuel et fiable"</span></div>
    <div class="eval-row" data-anim-row><span>Intégration équipe</span><span class="estars">●●●○○</span><span>"Apprécié mais reste discret"</span></div>
    <div class="eval-row" data-anim-row><span>Autonomie / Initiative</span><span class="estars elow">●●○○○</span><span>"Attend les consignes plutôt que de proposer"</span></div>
    <div class="eval-row" data-anim-row><span>Maîtrise des outils</span><span class="estars elow">●●○○○</span><span>"Erreur sur la charte graphique en mars"</span></div>
  </div>
  <div class="eval-comment" data-anim-row>
    <div class="eval-comment-lbl">Appréciation générale, Thomas Rey</div>
    <p>"Profil agréable et fiable sur l'exécution. L'incident de mars a marqué l'équipe, et le manque de propositions spontanées sur 2 mois nous interpelle pour un poste de chargé de communication où la proactivité est attendue."</p>
  </div>
  <div class="eval-decision" data-anim-row>
    <span>☐ Renouvellement confirmé</span>
    <span>☐ Période d'essai non renouvelée</span>
    <span class="eval-pending">☑ Décision en attente, point RH prévu</span>
  </div>
</div>`,

];


// ══════════════════════════════════════════════════
//  PORTRAITS PSYCHOLOGIQUES (app de travail uniquement)
//  Conservés pour index.html, non utilisés par participant.html.
//  Version raccourcie et factuelle.
// ══════════════════════════════════════════════════

const INTRO = {
  c: `<p>Vous êtes <strong>Mehdi Arif</strong>, candidat au poste de chargé de communication chez ComStudio.</p>
<p>Vous allez vivre six moments-clés de ce recrutement, comme si vous étiez à sa place.</p>`,

  r: `<p>Vous êtes <strong>Sophie Martin</strong>, responsable RH chez ComStudio.</p>
<p>Vous allez vivre six moments-clés du recrutement de Mehdi, comme si vous étiez à sa place.</p>`,
};

// Méta-rôles pour l'affichage UI (libellés courts)
const ROLES = {
  c: { name: 'Mehdi Arif',    short: 'Mehdi',  label: 'Candidat',     initial: 'M' },
  r: { name: 'Sophie Martin', short: 'Sophie', label: 'Recruteuse RH', initial: 'S' },
};
