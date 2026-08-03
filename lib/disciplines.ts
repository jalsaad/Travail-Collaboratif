/**
 * Disciplines enseignées en Fédération Wallonie-Bruxelles
 * Référentiel : fonctions (décret Titres & Fonctions, AGCF 05/06/2014)
 * Source : http://www.enseignement.be/index.php?page=27399&navi=4028
 *
 * Le "code" est le n° officiel de la fonction. Il est stable et
 * interopérable avec les documents administratifs (Primoweb, grilles-horaires,
 * déclarations au PO). C'est lui qu'on stocke, pas le libellé.
 *
 * Une matière porte jusqu'à deux codes : un pour le degré inférieur (DI),
 * un pour le degré supérieur (DS). Quelques matières n'existent qu'à un degré,
 * ou partagent un code unique pour les deux (codeDI === codeDS).
 */

export type Famille = 'CG' | 'CT' | 'CA' | 'FOND' | 'AUTRE';
export type Degre = 'DI' | 'DS';

export interface Discipline {
  /** identifiant applicatif, stable, indépendant du libellé */
  slug: string;
  label: string;
  famille: Famille;
  codeDI: number | null;
  codeDS: number | null;
  /** true = matière fréquente dans un athénée général/technique */
  courant?: boolean;
}

export const FAMILLES: Record<Famille, string> = {
  CG: 'Cours généraux',
  CT: 'Cours techniques',
  CA: 'Cours artistiques',
  FOND: 'Enseignement fondamental',
  AUTRE: 'Autre',
};

export const DISCIPLINES: Discipline[] = [
  // --- Cours généraux ---
  { slug: 'francais', label: 'Français', famille: 'CG', codeDI: 19, codeDS: 228, courant: true },
  { slug: 'mathematiques', label: 'Mathématiques', famille: 'CG', codeDI: 26, codeDS: 235, courant: true },
  { slug: 'sciences', label: 'Sciences', famille: 'CG', codeDI: 30, codeDS: 241, courant: true },
  { slug: 'biologie', label: 'Biologie', famille: 'CG', codeDI: 12, codeDS: 222, courant: true },
  { slug: 'chimie', label: 'Chimie', famille: 'CG', codeDI: 13, codeDS: 223, courant: true },
  { slug: 'physique', label: 'Physique', famille: 'CG', codeDI: 28, codeDS: 238, courant: true },
  { slug: 'histoire', label: 'Histoire', famille: 'CG', codeDI: 23, codeDS: 232, courant: true },
  { slug: 'geographie', label: 'Géographie', famille: 'CG', codeDI: 21, codeDS: 230, courant: true },
  { slug: 'formation-hges', label: 'Formation historique, géographique, économique et sociale', famille: 'CG', codeDI: 1142, codeDS: null, courant: true },
  { slug: 'neerlandais', label: 'Néerlandais', famille: 'CG', codeDI: 27, codeDS: 236, courant: true },
  { slug: 'anglais', label: 'Anglais', famille: 'CG', codeDI: 10, codeDS: 220, courant: true },
  { slug: 'allemand', label: 'Allemand', famille: 'CG', codeDI: 9, codeDS: 219, courant: true },
  { slug: 'espagnol', label: 'Espagnol', famille: 'CG', codeDI: 17, codeDS: 227 },
  { slug: 'italien', label: 'Italien', famille: 'CG', codeDI: 24, codeDS: 233 },
  { slug: 'arabe', label: 'Arabe', famille: 'CG', codeDI: 11, codeDS: 221 },
  { slug: 'chinois', label: 'Chinois', famille: 'CG', codeDI: 975, codeDS: 976 },
  { slug: 'russe', label: 'Russe', famille: 'CG', codeDI: 29, codeDS: 240 },
  { slug: 'portugais', label: 'Portugais', famille: 'CG', codeDI: null, codeDS: 239 },
  { slug: 'fle', label: 'Français langue étrangère (FLE)', famille: 'CG', codeDI: 20, codeDS: 229, courant: true },
  { slug: 'latin', label: 'Latin', famille: 'CG', codeDI: 1143, codeDS: 1144, courant: true },
  { slug: 'latin-di-ds', label: 'Latin (DI/DS – code unique)', famille: 'CG', codeDI: 212, codeDS: 212 },
  { slug: 'grec-ancien', label: 'Grec ancien (DI/DS – code unique)', famille: 'CG', codeDI: 211, codeDS: 211 },
  { slug: 'philo-citoyennete', label: 'Philosophie et Citoyenneté', famille: 'CG', codeDI: 1052, codeDS: 1053, courant: true },
  { slug: 'philo-citoyennete-f1f2', label: 'Philosophie et Citoyenneté F1-F2', famille: 'CG', codeDI: 1061, codeDS: null },
  { slug: 'philosophie', label: 'Philosophie', famille: 'CG', codeDI: null, codeDS: 237 },
  { slug: 'education-physique', label: 'Éducation physique', famille: 'CG', codeDI: 15, codeDS: 225, courant: true },
  { slug: 'education-musicale', label: 'Éducation musicale', famille: 'CG', codeDI: 14, codeDS: 224, courant: true },
  { slug: 'education-plastique', label: 'Éducation plastique', famille: 'CG', codeDI: 16, codeDS: 226, courant: true },
  { slug: 'histoire-de-lart', label: "Histoire de l'art", famille: 'CG', codeDI: 22, codeDS: 231 },
  { slug: 'sciences-economiques', label: 'Sciences économiques', famille: 'CG', codeDI: 31, codeDS: 242, courant: true },
  { slug: 'sciences-humaines', label: 'Sciences humaines', famille: 'CG', codeDI: 32, codeDS: 243 },
  { slug: 'sciences-sociales', label: 'Sciences sociales', famille: 'CG', codeDI: 33, codeDS: 244, courant: true },
  { slug: 'formation-generale-de-base', label: 'Formation générale de base', famille: 'CG', codeDI: 18, codeDS: null },
  { slug: 'langue-des-signes', label: 'Langue des signes', famille: 'CG', codeDI: 25, codeDS: 234 },
  { slug: 'adaptation-sociale', label: 'Adaptation sociale', famille: 'CG', codeDI: 8, codeDS: null },
  { slug: 'activites-communication-socialisation', label: 'Activités de communication et de socialisation', famille: 'CG', codeDI: 7, codeDS: null },

  // --- Cours artistiques ---
  { slug: 'art-de-la-couleur', label: 'Art de la couleur', famille: 'CA', codeDI: 1, codeDS: 213 },
  { slug: 'art-du-trait', label: 'Art du trait', famille: 'CA', codeDI: 2, codeDS: 214 },
  { slug: 'art-du-volume', label: 'Art du volume', famille: 'CA', codeDI: 3, codeDS: 215 },
  { slug: 'arts-du-cirque', label: 'Arts du cirque', famille: 'CA', codeDI: 1062, codeDS: 1065 },
  { slug: 'danse-classique', label: 'Danse classique', famille: 'CA', codeDI: 4, codeDS: 216 },
  { slug: 'danse-contemporaine', label: 'Danse contemporaine', famille: 'CA', codeDI: 5, codeDS: 217 },
  { slug: 'graphisme-et-image', label: 'Graphisme et image', famille: 'CA', codeDI: 6, codeDS: 218 },

  // --- Cours techniques ---
  { slug: 'informatique', label: 'Informatique', famille: 'CT', codeDI: 85, codeDS: 313, courant: true },
  { slug: 'informatique-de-gestion', label: 'Informatique de gestion', famille: 'CT', codeDI: 84, codeDS: 312, courant: true },
  { slug: 'informatique-industrielle', label: 'Informatique industrielle', famille: 'CT', codeDI: 86, codeDS: 314 },
  { slug: 'numerique', label: 'Numérique', famille: 'CT', codeDI: 1146, codeDS: null, courant: true },
  { slug: 'infographie', label: 'Infographie', famille: 'CT', codeDI: 977, codeDS: 311 },
  { slug: 'cours-commerciaux', label: 'Cours commerciaux', famille: 'CT', codeDI: 58, codeDS: 278, courant: true },
  { slug: 'comptabilite', label: 'Comptabilité', famille: 'CT', codeDI: null, codeDS: 1051, courant: true },
  { slug: 'secretariat-bureautique', label: 'Secrétariat-bureautique', famille: 'CT', codeDI: 107, codeDS: 345, courant: true },
  { slug: 'droit', label: 'Droit', famille: 'CT', codeDI: 1100, codeDS: 287 },
  { slug: 'communication', label: 'Communication', famille: 'CT', codeDI: 1050, codeDS: 272 },
  { slug: 'gestion-de-projet', label: 'Gestion de projet', famille: 'CT', codeDI: 77, codeDS: 302 },
  { slug: 'education-technologique', label: 'Éducation technologique', famille: 'CT', codeDI: 65, codeDS: null, courant: true },
  { slug: 'formation-manuelle-technique', label: 'Formation manuelle, technique et technologique', famille: 'CT', codeDI: 1145, codeDS: null, courant: true },
  { slug: 'psychopedagogie', label: 'Psychopédagogie', famille: 'CT', codeDI: 102, codeDS: 338, courant: true },
  { slug: 'psychologie', label: 'Psychologie', famille: 'CT', codeDI: 1101, codeDS: 337 },
  { slug: 'techniques-educatives', label: 'Techniques éducatives', famille: 'CT', codeDI: 124, codeDS: 367, courant: true },
  { slug: 'puericulture', label: 'Puériculture', famille: 'CT', codeDI: 104, codeDS: 340, courant: true },
  { slug: 'soins-aux-personnes', label: 'Soins aux personnes', famille: 'CT', codeDI: 109, codeDS: 349, courant: true },
  { slug: 'soins-infirmiers', label: 'Soins infirmiers', famille: 'CT', codeDI: 1029, codeDS: 350 },
  { slug: 'sciences-infirmieres', label: 'Sciences infirmières', famille: 'CT', codeDI: null, codeDS: 343 },
  { slug: 'sciences-biomedicales', label: 'Sciences biomédicales', famille: 'CT', codeDI: null, codeDS: 342 },
  { slug: 'economie-sociale-familiale', label: 'Économie sociale et familiale', famille: 'CT', codeDI: 64, codeDS: 289, courant: true },
  { slug: 'dietetique', label: 'Diététique', famille: 'CT', codeDI: 1095, codeDS: 286 },
  { slug: 'coiffure', label: 'Coiffure', famille: 'CT', codeDI: 54, codeDS: 270 },
  { slug: 'bio-esthetique', label: 'Bio-esthétique', famille: 'CT', codeDI: 46, codeDS: 259 },
  { slug: 'analyse-esthetique', label: 'Analyse esthétique', famille: 'CT', codeDI: 38, codeDS: 248 },
  { slug: 'cuisine-de-restauration', label: 'Cuisine de restauration', famille: 'CT', codeDI: 61, codeDS: 281 },
  { slug: 'cuisine-de-collectivites', label: 'Cuisine de collectivités', famille: 'CT', codeDI: 60, codeDS: 280 },
  { slug: 'cuisine-familiale', label: 'Cuisine familiale', famille: 'CT', codeDI: 62, codeDS: 282 },
  { slug: 'service-en-salle', label: 'Service en salle', famille: 'CT', codeDI: 108, codeDS: 347 },
  { slug: 'service-boissons', label: 'Service boissons', famille: 'CT', codeDI: null, codeDS: 346 },
  { slug: 'gestion-hoteliere', label: 'Gestion hôtelière', famille: 'CT', codeDI: null, codeDS: 303 },
  { slug: 'oenologie', label: 'Œnologie', famille: 'CT', codeDI: null, codeDS: 324 },
  { slug: 'boulangerie-patisserie', label: 'Boulangerie-pâtisserie', famille: 'CT', codeDI: 49, codeDS: 261 },
  { slug: 'boucherie-charcuterie', label: 'Boucherie-charcuterie', famille: 'CT', codeDI: 48, codeDS: 260 },
  { slug: 'chocolaterie-glaces-confiserie', label: 'Chocolaterie-glaces-confiserie', famille: 'CT', codeDI: null, codeDS: 268 },
  { slug: 'agro-alimentaire', label: 'Agro-alimentaire', famille: 'CT', codeDI: 36, codeDS: 246 },
  { slug: 'tourisme', label: 'Tourisme', famille: 'CT', codeDI: 1122, codeDS: null },
  { slug: 'logistique', label: 'Logistique', famille: 'CT', codeDI: 1007, codeDS: 1009 },
  { slug: 'electricite', label: 'Électricité', famille: 'CT', codeDI: 66, codeDS: 290, courant: true },
  { slug: 'electronique', label: 'Électronique', famille: 'CT', codeDI: 69, codeDS: 293 },
  { slug: 'electromecanique', label: 'Électromécanique', famille: 'CT', codeDI: 68, codeDS: 292, courant: true },
  { slug: 'automation', label: 'Automation', famille: 'CT', codeDI: 1135, codeDS: 256 },
  { slug: 'mecanique-industrielle', label: 'Mécanique industrielle', famille: 'CT', codeDI: 92, codeDS: 320 },
  { slug: 'mecanique-automobile', label: 'Mécanique automobile', famille: 'CT', codeDI: 91, codeDS: 319 },
  { slug: 'electricite-electronique-auto', label: "Électricité et électronique de l'automobile", famille: 'CT', codeDI: 67, codeDS: 291 },
  { slug: 'carrosserie', label: 'Carrosserie', famille: 'CT', codeDI: 52, codeDS: 264 },
  { slug: 'motos-petits-engins', label: 'Motos-petits engins', famille: 'CT', codeDI: 94, codeDS: 323 },
  { slug: 'cycles', label: 'Cycles', famille: 'CT', codeDI: 63, codeDS: 283 },
  { slug: 'microtechnique', label: 'Microtechnique', famille: 'CT', codeDI: 93, codeDS: 322 },
  { slug: 'commande-numerique', label: 'Commande numérique', famille: 'CT', codeDI: null, codeDS: 271 },
  { slug: 'soudage-constructions-metalliques', label: 'Soudage-constructions métalliques', famille: 'CT', codeDI: 110, codeDS: 351 },
  { slug: 'ferronnerie', label: 'Ferronnerie', famille: 'CT', codeDI: 76, codeDS: 300 },
  { slug: 'chimie-industrielle', label: 'Chimie industrielle', famille: 'CT', codeDI: null, codeDS: 266 },
  { slug: 'plastiques-industriels', label: 'Plastiques industriels', famille: 'CT', codeDI: null, codeDS: 334 },
  { slug: 'construction', label: 'Construction', famille: 'CT', codeDI: 56, codeDS: 276 },
  { slug: 'gros-oeuvre', label: 'Gros-Œuvre', famille: 'CT', codeDI: 79, codeDS: 306 },
  { slug: 'architecture', label: 'Architecture', famille: 'CT', codeDI: null, codeDS: 249 },
  { slug: 'menuiserie', label: 'Menuiserie', famille: 'CT', codeDI: null, codeDS: 321 },
  { slug: 'ebenisterie', label: 'Ébénisterie', famille: 'CT', codeDI: null, codeDS: 288 },
  { slug: 'bois', label: 'Bois', famille: 'CT', codeDI: 47, codeDS: null },
  { slug: 'carrelage', label: 'Carrelage', famille: 'CT', codeDI: 51, codeDS: 263 },
  { slug: 'plafonnage', label: 'Plafonnage', famille: 'CT', codeDI: 101, codeDS: 333 },
  { slug: 'couverture', label: 'Couverture', famille: 'CT', codeDI: 59, codeDS: 279 },
  { slug: 'peinture-revetements', label: 'Peinture-revêtements murs et sols', famille: 'CT', codeDI: 99, codeDS: 330 },
  { slug: 'taille-de-la-pierre', label: 'Taille de la pierre', famille: 'CT', codeDI: 122, codeDS: 363 },
  { slug: 'pavage', label: 'Pavage', famille: 'CT', codeDI: 98, codeDS: 328 },
  { slug: 'ouvrier-routier-voiriste', label: 'Ouvrier routier/voiriste', famille: 'CT', codeDI: 96, codeDS: 326 },
  { slug: 'engins-de-chantier', label: 'Engins de chantier', famille: 'CT', codeDI: 1114, codeDS: 295 },
  { slug: 'installations-sanitaires', label: 'Installations sanitaires', famille: 'CT', codeDI: 87, codeDS: 315 },
  { slug: 'chauffage', label: 'Chauffage', famille: 'CT', codeDI: 53, codeDS: 265 },
  { slug: 'climatisation', label: 'Climatisation', famille: 'CT', codeDI: null, codeDS: 269 },
  { slug: 'techniques-du-froid', label: 'Techniques du froid', famille: 'CT', codeDI: 1104, codeDS: 366 },
  { slug: 'agriculture', label: 'Agriculture', famille: 'CT', codeDI: 35, codeDS: 245 },
  { slug: 'agronomie', label: 'Agronomie', famille: 'CT', codeDI: 37, codeDS: 247 },
  { slug: 'horticulture', label: 'Horticulture', famille: 'CT', codeDI: 81, codeDS: 309 },
  { slug: 'sylviculture', label: 'Sylviculture', famille: 'CT', codeDI: 121, codeDS: 362 },
  { slug: 'grimpeur-elagueur', label: 'Grimpeur-élagueur', famille: 'CT', codeDI: null, codeDS: 305 },
  { slug: 'elevage', label: 'Élevage', famille: 'CT', codeDI: 70, codeDS: 294 },
  { slug: 'soins-animaliers', label: 'Soins animaliers', famille: 'CT', codeDI: 1120, codeDS: 348 },
  { slug: 'equitation', label: 'Équitation', famille: 'CT', codeDI: 73, codeDS: 297 },
  { slug: 'palefrenier', label: 'Palefrenier', famille: 'CT', codeDI: 97, codeDS: 327 },
  { slug: 'marechalerie', label: 'Maréchalerie', famille: 'CT', codeDI: 88, codeDS: 316 },
  { slug: 'mecanique-agricole', label: 'Mécanique agricole, horticole et sylvicole', famille: 'CT', codeDI: 90, codeDS: 318 },
  { slug: 'art-floral', label: 'Art floral', famille: 'CT', codeDI: 40, codeDS: 252 },
  { slug: 'environnement', label: 'Environnement', famille: 'CT', codeDI: 72, codeDS: 296 },
  { slug: 'arts-appliques', label: 'Arts appliqués', famille: 'CT', codeDI: 41, codeDS: 253 },
  { slug: 'arts-graphiques', label: 'Arts graphiques', famille: 'CT', codeDI: 42, codeDS: 254 },
  { slug: 'industrie-graphique', label: 'Industrie graphique', famille: 'CT', codeDI: 83, codeDS: null },
  { slug: 'imprimerie', label: 'Imprimerie', famille: 'CT', codeDI: 82, codeDS: 310 },
  { slug: 'reliure', label: 'Reliure', famille: 'CT', codeDI: 105, codeDS: 341 },
  { slug: 'gravure', label: 'Gravure', famille: 'CT', codeDI: 78, codeDS: 304 },
  { slug: 'sculpture', label: 'Sculpture', famille: 'CT', codeDI: 106, codeDS: 344 },
  { slug: 'photographie', label: 'Photographie', famille: 'CT', codeDI: 100, codeDS: 332 },
  { slug: 'audiovisuel', label: 'Audiovisuel', famille: 'CT', codeDI: 43, codeDS: 255 },
  { slug: 'publicite', label: 'Publicité', famille: 'CT', codeDI: 103, codeDS: 339 },
  { slug: 'etalage', label: 'Étalage', famille: 'CT', codeDI: 74, codeDS: 298 },
  { slug: 'decoration', label: 'Décoration', famille: 'CT', codeDI: 1112, codeDS: 284 },
  { slug: 'encadrement', label: 'Encadrement', famille: 'CT', codeDI: 71, codeDS: null },
  { slug: 'expression-theatrale', label: 'Expression théâtrale', famille: 'CT', codeDI: 75, codeDS: 299 },
  { slug: 'confection', label: 'Confection', famille: 'CT', codeDI: 55, codeDS: 275 },
  { slug: 'tailleur', label: 'Tailleur', famille: 'CT', codeDI: null, codeDS: 364 },
  { slug: 'tapisserie-garnissage', label: 'Tapisserie-garnissage', famille: 'CT', codeDI: 123, codeDS: 365 },
  { slug: 'maroquinerie', label: 'Maroquinerie', famille: 'CT', codeDI: 89, codeDS: 317 },
  { slug: 'cordonnerie', label: 'Cordonnerie', famille: 'CT', codeDI: 57, codeDS: 277 },
  { slug: 'chaussures-orthopediques', label: 'Chaussures orthopédiques', famille: 'CT', codeDI: 1132, codeDS: 1031 },
  { slug: 'bijouterie-joaillerie', label: 'Bijouterie-joaillerie', famille: 'CT', codeDI: 45, codeDS: 258 },
  { slug: 'horlogerie', label: 'Horlogerie', famille: 'CT', codeDI: 80, codeDS: 308 },
  { slug: 'accordage', label: 'Accordage', famille: 'CT', codeDI: 34, codeDS: null },
  { slug: 'optique', label: 'Optique', famille: 'CT', codeDI: 95, codeDS: 325 },
  { slug: 'pharmacie', label: 'Pharmacie', famille: 'CT', codeDI: 1116, codeDS: 331 },
  { slug: 'prothese-dentaire', label: 'Prothèse dentaire', famille: 'CT', codeDI: 1118, codeDS: 335 },
  { slug: 'dentisterie', label: 'Dentisterie', famille: 'CT', codeDI: null, codeDS: 285 },
  { slug: 'bandagisterie', label: 'Bandagisterie-orthèse-prothèse', famille: 'CT', codeDI: 1106, codeDS: 1030 },
  { slug: 'pedicurie-medicale', label: 'Pédicurie médicale', famille: 'CT', codeDI: null, codeDS: 1010 },
  { slug: 'medecine', label: 'Médecine', famille: 'CT', codeDI: null, codeDS: 1054 },
  { slug: 'chirurgie', label: 'Chirurgie', famille: 'CT', codeDI: null, codeDS: 267 },
  { slug: 'geriatrie', label: 'Gériatrie', famille: 'CT', codeDI: null, codeDS: 301 },
  { slug: 'gynecologie', label: 'Gynécologie', famille: 'CT', codeDI: null, codeDS: 307 },
  { slug: 'pediatrie', label: 'Pédiatrie', famille: 'CT', codeDI: null, codeDS: 329 },
  { slug: 'psychiatrie', label: 'Psychiatrie', famille: 'CT', codeDI: null, codeDS: 336 },
  { slug: 'prevention', label: 'Prévention', famille: 'CT', codeDI: 1099, codeDS: 980 },
  { slug: 'gardiennage', label: 'Gardiennage', famille: 'CT', codeDI: 1098, codeDS: 978 },
  { slug: 'legislation-gardiennage', label: 'Législation gardiennage', famille: 'CT', codeDI: null, codeDS: 979 },
  { slug: 'psychologie-de-la-securite', label: 'Psychologie de la sécurité', famille: 'CT', codeDI: 1097, codeDS: 1082 },
  { slug: 'techniques-desquive', label: "Techniques d'esquive", famille: 'CT', codeDI: null, codeDS: 981 },
  { slug: 'armurerie', label: 'Armurerie', famille: 'CT', codeDI: 39, codeDS: 251 },
  { slug: 'armurerie-bois', label: 'Armurerie Bois', famille: 'CT', codeDI: null, codeDS: 250 },
  { slug: 'batellerie', label: 'Batellerie', famille: 'CT', codeDI: 44, codeDS: 257 },
  { slug: 'cariste', label: 'Cariste', famille: 'CT', codeDI: 50, codeDS: 262 },
  { slug: 'conducteur-autobus-car', label: 'Conducteur autobus-car', famille: 'CT', codeDI: 1108, codeDS: 273 },
  { slug: 'conducteur-poids-lourds', label: 'Conducteur poids lourds', famille: 'CT', codeDI: 1110, codeDS: 274 },

  // --- Sports spécifiques (CT) ---
  { slug: 'sport-athletisme', label: 'Sports spécifiques : athlétisme', famille: 'CT', codeDI: 111, codeDS: 352 },
  { slug: 'sport-basketball', label: 'Sports spécifiques : basketball', famille: 'CT', codeDI: 112, codeDS: 353 },
  { slug: 'sport-boxe-anglaise', label: 'Sports spécifiques : boxe anglaise', famille: 'CT', codeDI: 1149, codeDS: 1151 },
  { slug: 'sport-boxe-thailandaise', label: 'Sports spécifiques : boxe thaïlandaise', famille: 'CT', codeDI: 1153, codeDS: 1155 },
  { slug: 'sport-cyclisme', label: 'Sports spécifiques : cyclisme', famille: 'CT', codeDI: 113, codeDS: 354 },
  { slug: 'sport-danses-sportives', label: 'Sports spécifiques : danses sportives', famille: 'CT', codeDI: 1137, codeDS: 1139 },
  { slug: 'sport-equitation', label: 'Sports spécifiques : équitation', famille: 'CT', codeDI: 114, codeDS: 355 },
  { slug: 'sport-fitness', label: 'Sports spécifiques : fitness', famille: 'CT', codeDI: 1070, codeDS: 1076 },
  { slug: 'sport-football', label: 'Sports spécifiques : football', famille: 'CT', codeDI: 115, codeDS: 356 },
  { slug: 'sport-gymnastique', label: 'Sports spécifiques : gymnastique', famille: 'CT', codeDI: 116, codeDS: 357 },
  { slug: 'sport-handball', label: 'Sports spécifiques : handball', famille: 'CT', codeDI: 1084, codeDS: 1085 },
  { slug: 'sport-hockey', label: 'Sports spécifiques : hockey', famille: 'CT', codeDI: 1071, codeDS: 1077 },
  { slug: 'sport-ju-jitsu', label: 'Sports spécifiques : Ju Jitsu', famille: 'CT', codeDI: 1072, codeDS: 1078 },
  { slug: 'sport-judo', label: 'Sports spécifiques : judo', famille: 'CT', codeDI: 117, codeDS: 358 },
  { slug: 'sport-natation', label: 'Sports spécifiques : natation', famille: 'CT', codeDI: 118, codeDS: 359 },
  { slug: 'sport-rugby', label: 'Sports spécifiques : rugby', famille: 'CT', codeDI: 119, codeDS: 360 },
  { slug: 'sport-tennis', label: 'Sports spécifiques : tennis', famille: 'CT', codeDI: 120, codeDS: 361 },
  { slug: 'sport-volleyball', label: 'Sports spécifiques : volleyball', famille: 'CT', codeDI: 1086, codeDS: 1087 },

  // --- Enseignement fondamental ---
  { slug: 'instituteur-maternel', label: 'Instituteur·rice maternel·le', famille: 'FOND', codeDI: 950, codeDS: null },
  { slug: 'instituteur-primaire', label: 'Instituteur·rice primaire', famille: 'FOND', codeDI: 951, codeDS: null },
  { slug: 'instituteur-primaire-maturite', label: 'Instituteur·rice primaire maturité I / II type 2', famille: 'FOND', codeDI: 1094, codeDS: null },
  { slug: 'maitre-education-musicale', label: "Maître d'éducation musicale", famille: 'FOND', codeDI: 959, codeDS: null },
  { slug: 'maitre-education-physique', label: "Maître d'éducation physique", famille: 'FOND', codeDI: 960, codeDS: null },
  { slug: 'maitre-psychomotricite', label: 'Maître de psychomotricité', famille: 'FOND', codeDI: 954, codeDS: null },
  { slug: 'maitre-travaux-manuels', label: 'Maître de travaux manuels', famille: 'FOND', codeDI: 958, codeDS: null },
  { slug: 'maitre-langue-des-signes', label: 'Maître de langue des signes', famille: 'FOND', codeDI: 952, codeDS: null },
  { slug: 'maitre-2e-langue-neerlandais', label: 'Maître de seconde langue : néerlandais', famille: 'FOND', codeDI: 957, codeDS: null },
  { slug: 'maitre-2e-langue-anglais', label: 'Maître de seconde langue : anglais', famille: 'FOND', codeDI: 956, codeDS: null },
  { slug: 'maitre-2e-langue-allemand', label: 'Maître de seconde langue : allemand', famille: 'FOND', codeDI: 955, codeDS: null },
  { slug: 'maitre-philo-citoyennete', label: 'Maître de Philosophie et de Citoyenneté', famille: 'FOND', codeDI: 1028, codeDS: null },
  { slug: 'maitre-morale', label: 'Maître de morale', famille: 'FOND', codeDI: 953, codeDS: null },
  { slug: 'maitre-religion-catholique', label: 'Maître de Religion catholique', famille: 'FOND', codeDI: 1002, codeDS: null },
  { slug: 'maitre-religion-islamique', label: 'Maître de Religion islamique', famille: 'FOND', codeDI: 1003, codeDS: null },
  { slug: 'maitre-religion-orthodoxe', label: 'Maître de Religion orthodoxe', famille: 'FOND', codeDI: 1004, codeDS: null },
  { slug: 'maitre-religion-israelite', label: 'Maître de Religion israélite', famille: 'FOND', codeDI: 1005, codeDS: null },
  { slug: 'maitre-religion-protestante', label: 'Maître de Religion protestante', famille: 'FOND', codeDI: 1006, codeDS: null },

  // --- Divers / échappatoire ---
  { slug: 'accompagnateur-piano', label: 'Accompagnateur piano', famille: 'AUTRE', codeDI: 476, codeDS: 476 },
  { slug: 'autre', label: 'Autre (à préciser)', famille: 'AUTRE', codeDI: null, codeDS: null },
];

/* ----------------------------------------------------------------
   Helpers
*/

export interface DisciplineOption {
  /** valeur à stocker : "19" pour CG Français DI */
  value: string;
  label: string;
  famille: Famille;
  courant: boolean;
}

/** Aplatit en options { code fonction -> libellé } prêtes pour un select. */
export function toOptions(disciplines = DISCIPLINES): DisciplineOption[] {
  const out: DisciplineOption[] = [];
  for (const d of disciplines) {
    if (d.codeDI && d.codeDS && d.codeDI === d.codeDS) {
      out.push({ value: String(d.codeDI), label: d.label, famille: d.famille, courant: !!d.courant });
      continue;
    }
    if (d.codeDI) {
      const suffix = d.famille === 'FOND' || d.famille === 'AUTRE' ? '' : ' – DI';
      out.push({ value: String(d.codeDI), label: d.label + suffix, famille: d.famille, courant: !!d.courant });
    }
    if (d.codeDS) {
      out.push({ value: String(d.codeDS), label: `${d.label} – DS`, famille: d.famille, courant: !!d.courant });
    }
    if (!d.codeDI && !d.codeDS) {
      out.push({ value: d.slug, label: d.label, famille: d.famille, courant: !!d.courant });
    }
  }
  return out;
}

/** Regroupe par famille pour des <optgroup>. */
export function groupByFamille(options = toOptions()) {
  return (Object.keys(FAMILLES) as Famille[])
    .map((f) => ({ famille: f, label: FAMILLES[f], options: options.filter((o) => o.famille === f) }))
    .filter((g) => g.options.length > 0);
}

/** Sous-ensemble à proposer en tête de liste dans un athénée général/technique. */
export const DISCIPLINES_COURANTES = DISCIPLINES.filter((d) => d.courant);

export const bySlug = new Map(DISCIPLINES.map((d) => [d.slug, d]));
export const byCode = new Map<number, { discipline: Discipline; degre: Degre }>(
  DISCIPLINES.flatMap((d) => {
    const e: [number, { discipline: Discipline; degre: Degre }][] = [];
    if (d.codeDI) e.push([d.codeDI, { discipline: d, degre: 'DI' }]);
    if (d.codeDS && d.codeDS !== d.codeDI) e.push([d.codeDS, { discipline: d, degre: 'DS' }]);
    return e;
  })
);
