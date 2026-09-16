// Fuseau d'affichage de toutes les dates et heures de la plateforme.
//
// Le serveur de production tourne en UTC : sans fuseau explicite,
// toLocaleDateString/toLocaleTimeString y formatent en UTC, soit 1 h (hiver)
// ou 2 h (été) de retard sur l'heure belge — et, entre minuit et 2 h, une date
// affichée seule tombe sur la veille. Le passer à chaque formatage rend aussi
// le rendu serveur identique au rendu navigateur des composants client.
//
// Les dates « calendaires » (date d'une période, date de naissance) sont
// stockées à minuit UTC : les afficher à l'heure de Bruxelles (UTC+1/+2)
// conserve le même jour.
export const APP_TIME_ZONE = "Europe/Brussels";
