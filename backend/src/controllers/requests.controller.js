require('dotenv').config();
const { query } = require('../config/database');
const wa = require('../services/whatsapp.service');

const REQ_FIELDS = `
  dd.id, dd.employe_id, dd.commune_id, dd.date_deplacement,
  dd.heure_depart, dd.heure_retour, dd.objectif, dd.statut,
  dd.chauffeur_id, dd.vehicule_id, dd.date_creation, dd.date_modification,
  e.nom   AS employe_nom,   e.prenoms AS employe_prenoms,
  e.poste AS employe_poste, e.projet  AS employe_projet,
  c.nom   AS commune_nom,
  v.immatriculation, v.marque, v.modele, v.capacite AS vehicule_capacite,
  ch.nom AS chauffeur_nom, ch.prenoms AS chauffeur_prenoms, ch.telephone AS chauffeur_tel
`;

const REQ_JOINS = `
  FROM demande_deplacement dd
  JOIN employees  e  ON e.id  = dd.employe_id
  JOIN communes   c  ON c.id  = dd.commune_id
  LEFT JOIN vehicules  v  ON v.id  = dd.vehicule_id
  LEFT JOIN chauffeurs ch ON ch.id = dd.chauffeur_id
`;

/**
 * Récupère les passagers d'une liste de demandes
 */
const fetchPassagers = async (ids) => {
  if (!ids.length) return [];
  const r = await query(
    `SELECT dp.demande_id,
            e.id, e.nom, e.prenoms, e.poste, e.projet,
            e.prenoms || ' ' || e.nom AS name
     FROM demande_passagers dp
     JOIN employees e ON e.id = dp.employe_id
     WHERE dp.demande_id = ANY($1)`,
    [ids]
  );
  return r.rows;
};

/** GET /api/requests */
const getAll = async (req, res, next) => {
  try {
    const { statut, commune_id, from, to, employe_id } = req.query;
    const role = req.user.role;

    let sql = `SELECT ${REQ_FIELDS} ${REQ_JOINS} WHERE 1=1`;
    const params = [];

    if (role === 'user') {
      const emp = await query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
      if (emp.rows[0]) {
        params.push(emp.rows[0].id);
        // Voit ses demandes OU celles où il est passager
        sql += ` AND (dd.employe_id = $${params.length}
                  OR EXISTS (
                    SELECT 1 FROM demande_passagers dp
                    WHERE dp.demande_id = dd.id AND dp.employe_id = $${params.length}
                  ))`;
      }
    }
    if (employe_id) { params.push(employe_id); sql += ` AND dd.employe_id = $${params.length}`; }
    if (statut)     { params.push(statut);     sql += ` AND dd.statut = $${params.length}`; }
    if (commune_id) { params.push(commune_id); sql += ` AND dd.commune_id = $${params.length}`; }
    if (from)       { params.push(from);       sql += ` AND dd.date_deplacement >= $${params.length}`; }
    if (to)         { params.push(to);         sql += ` AND dd.date_deplacement <= $${params.length}`; }

    sql += ' ORDER BY dd.date_creation DESC';
    const result = await query(sql, params);
    const ids = result.rows.map(r => r.id);
    const passagers = await fetchPassagers(ids);

    const data = result.rows.map(r => ({
      ...r,
      employe_name:   `${r.employe_prenoms} ${r.employe_nom}`,
      chauffeur_name: r.chauffeur_nom ? `${r.chauffeur_prenoms} ${r.chauffeur_nom}` : null,
      passagers: passagers.filter(p => p.demande_id === r.id),
    }));

    res.json({ data, total: result.rowCount });
  } catch (err) { next(err); }
};

/** GET /api/requests/:id */
const getById = async (req, res, next) => {
  try {
    const r = await query(`SELECT ${REQ_FIELDS} ${REQ_JOINS} WHERE dd.id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Demande introuvable.' });
    const row = r.rows[0];
    const passagers = await fetchPassagers([row.id]);
    res.json({
      data: {
        ...row,
        employe_name:   `${row.employe_prenoms} ${row.employe_nom}`,
        chauffeur_name: row.chauffeur_nom ? `${row.chauffeur_prenoms} ${row.chauffeur_nom}` : null,
        passagers: passagers.filter(p => p.demande_id === row.id),
      }
    });
  } catch (err) { next(err); }
};

/** POST /api/requests */
const create = async (req, res, next) => {
  try {
    const {
      employe_id, commune_id, date_deplacement,
      heure_depart, heure_retour, objectif,
      passager_ids = [],   // ← tableau d'IDs d'employés passagers
    } = req.body;

    // Créer la demande principale
    const result = await query(
      `INSERT INTO demande_deplacement
         (employe_id, commune_id, date_deplacement, heure_depart, heure_retour, objectif)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [employe_id, commune_id, date_deplacement, heure_depart, heure_retour, objectif.trim()]
    );
    const newId = result.rows[0].id;

    // Insérer les passagers (en excluant l'initiateur s'il est dans la liste)
    const uniquePassagers = [...new Set(passager_ids)].filter(id => id !== parseInt(employe_id));
    for (const pid of uniquePassagers) {
      await query(
        'INSERT INTO demande_passagers (demande_id, employe_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [newId, pid]
      );
    }

    // Calcul total personnes (initiateur + passagers) pour suggestion véhicule
    const totalPersonnes = 1 + uniquePassagers.length;

    // Suggestions de regroupement : même commune + même date
    const similar = await query(
      `SELECT dd.id,
              e.prenoms || ' ' || e.nom AS employe_name,
              dd.heure_depart, dd.heure_retour,
              (SELECT COUNT(*) FROM demande_passagers WHERE demande_id = dd.id) + 1 AS total_personnes
       FROM demande_deplacement dd
       JOIN employees e ON e.id = dd.employe_id
       WHERE dd.commune_id       = $1
         AND dd.date_deplacement = $2
         AND dd.statut          != 'refusee'
         AND dd.id              != $3`,
      [commune_id, date_deplacement, newId]
    );

    // Suggestion de véhicule basée sur le nombre de personnes total
    let vehiculeSuggestion = null;
    if (similar.rows.length > 0) {
      const totalGroupe = similar.rows.reduce(
        (sum, r) => sum + parseInt(r.total_personnes), totalPersonnes
      );
      const veh = await query(
        `SELECT id, marque, modele, immatriculation, capacite
         FROM vehicules
         WHERE statut = 'disponible' AND capacite >= $1
         ORDER BY capacite ASC LIMIT 1`,
        [totalGroupe]
      );
      vehiculeSuggestion = veh.rows[0] || null;
    }

    res.status(201).json({
      data: { id: newId, total_personnes: totalPersonnes },
      message: 'Demande créée avec succès.',
      groupingSuggestions: similar.rows,
      vehiculeSuggestion,
    });
  } catch (err) { next(err); }
};

/** PATCH /api/requests/:id/validate */
const validate = async (req, res, next) => {
  try {
    const { vehicule_id, chauffeur_id } = req.body;

    if (vehicule_id) {
      const v = await query(`SELECT statut, capacite FROM vehicules WHERE id=$1`, [vehicule_id]);
      if (!v.rows[0] || v.rows[0].statut !== 'disponible')
        return res.status(400).json({ error: 'Véhicule non disponible.' });

      // Vérifier que la capacité est suffisante
      const countPass = await query(
        'SELECT COUNT(*) FROM demande_passagers WHERE demande_id=$1', [req.params.id]
      );
      const total = 1 + parseInt(countPass.rows[0].count);
      if (total > v.rows[0].capacite)
        return res.status(400).json({
          error: `Capacité insuffisante. ${total} personnes pour ${v.rows[0].capacite} places.`
        });
    }
    if (chauffeur_id) {
      const ch = await query(`SELECT statut FROM chauffeurs WHERE id=$1`, [chauffeur_id]);
      if (!ch.rows[0] || ch.rows[0].statut !== 'disponible')
        return res.status(400).json({ error: 'Chauffeur non disponible.' });
    }

    const r = await query(
      `UPDATE demande_deplacement
       SET statut='validee', vehicule_id=$1, chauffeur_id=$2, date_modification=CURRENT_TIMESTAMP
       WHERE id=$3 AND statut='en_attente' RETURNING *`,
      [vehicule_id || null, chauffeur_id || null, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Demande introuvable ou déjà traitée.' });

    if (vehicule_id)  await query(`UPDATE vehicules  SET statut='en_mission' WHERE id=$1`, [vehicule_id]);
    if (chauffeur_id) await query(`UPDATE chauffeurs SET statut='en_mission' WHERE id=$1`, [chauffeur_id]);

    // ── Notifications WhatsApp (non bloquant) ──────────────────
    const validated = r.rows[0];
    try {
      // Données de l'employé initiateur
      const empResult = await query(
        `SELECT e.prenoms, e.nom, e.telephone,
                c.nom AS commune_nom
         FROM employees e, communes c
         WHERE e.id = $1 AND c.id = $2`,
        [validated.employe_id, validated.commune_id]
      );
      const emp = empResult.rows[0];

      // Données du chauffeur affecté
      let chauffeurData = null;
      if (chauffeur_id) {
        const chResult = await query(
          `SELECT prenoms || ' ' || nom AS nom, telephone FROM chauffeurs WHERE id = $1`,
          [chauffeur_id]
        );
        chauffeurData = chResult.rows[0];
      }

      // Données du véhicule affecté
      let vehiculeLabel = 'À définir';
      if (vehicule_id) {
        const vResult = await query(
          `SELECT marque || ' ' || modele || ' — ' || immatriculation AS label FROM vehicules WHERE id = $1`,
          [vehicule_id]
        );
        vehiculeLabel = vResult.rows[0]?.label || 'À définir';
      }

      // Passagers de la demande
      const passResult = await query(
        `SELECT e.prenoms || ' ' || e.nom AS name, e.telephone
         FROM demande_passagers dp JOIN employees e ON e.id = dp.employe_id
         WHERE dp.demande_id = $1`,
        [validated.id]
      );
      const passagers = passResult.rows;

      if (emp?.telephone) {
        // Notification à l'initiateur + passagers
        await wa.notifyDemandeValidee({
          employe_name: `${emp.prenoms} ${emp.nom}`,
          telephone:    emp.telephone,
          communes:     [emp.commune_nom],
          date:         validated.date_deplacement,
          vehicule:     vehiculeLabel,
          chauffeur:    chauffeurData,
          passagers,
        });
      }

      // Notification au chauffeur
      if (chauffeurData?.telephone && emp) {
        await wa.notifyChauffeurMission({
          chauffeur_nom:      chauffeurData.nom,
          telephone:          chauffeurData.telephone,
          date:               validated.date_deplacement,
          communes:           [emp.commune_nom],
          heure_depart:       validated.heure_depart?.slice(0, 5),
          contact_initiateur: emp.telephone,
        });
      }
    } catch (waErr) {
      console.error('[WhatsApp] Erreur notification validation:', waErr.message);
    }

    res.json({ data: r.rows[0], message: 'Demande validée.' });
  } catch (err) { next(err); }
};

/** PATCH /api/requests/:id/reject */
const reject = async (req, res, next) => {
  try {
    // Récupérer la demande courante pour libérer véhicule/chauffeur si validée
    const current = await query(
      `SELECT statut, vehicule_id, chauffeur_id FROM demande_deplacement WHERE id=$1`,
      [req.params.id]
    );
    if (!current.rows[0]) return res.status(404).json({ error: 'Demande introuvable.' });

    const { statut, vehicule_id, chauffeur_id } = current.rows[0];
    if (statut === 'refusee') return res.status(400).json({ error: 'Demande déjà refusée.' });

    // Mettre à jour la demande
    const r = await query(
      `UPDATE demande_deplacement
       SET statut='refusee', vehicule_id=NULL, chauffeur_id=NULL,
           date_modification=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    // Si la demande était validée, libérer le véhicule et le chauffeur
    if (statut === 'validee') {
      if (vehicule_id) {
        await query(
          `UPDATE vehicules SET statut='disponible' WHERE id=$1 AND statut='en_mission'`,
          [vehicule_id]
        );
      }
      if (chauffeur_id) {
        await query(
          `UPDATE chauffeurs SET statut='disponible' WHERE id=$1 AND statut='en_mission'`,
          [chauffeur_id]
        );
      }
    }

    // ── Notification WhatsApp refus (non bloquant) ─────────────
    try {
      const empResult = await query(
        `SELECT e.prenoms, e.nom, e.telephone, c.nom AS commune_nom
         FROM employees e, communes c, demande_deplacement dd
         WHERE e.id = dd.employe_id AND c.id = dd.commune_id AND dd.id = $1`,
        [req.params.id]
      );
      const emp = empResult.rows[0];
      if (emp?.telephone) {
        await wa.notifyDemandeRefusee({
          employe_name: `${emp.prenoms} ${emp.nom}`,
          telephone:    emp.telephone,
          communes:     [emp.commune_nom],
          date:         r.rows[0].date_deplacement,
          motif:        req.body.reason,
        });
      }
    } catch (waErr) {
      console.error('[WhatsApp] Erreur notification refus:', waErr.message);
    }

    res.json({ data: r.rows[0], message: 'Demande refusée.' });
  } catch (err) { next(err); }
};

/** PATCH /api/requests/:id/complete — Clôture de mission avec kilométrage */
const complete = async (req, res, next) => {
  try {
    const { km_depart, km_retour } = req.body;

    // Récupérer la demande et vérifier qu'elle est validée
    const current = await query(
      `SELECT dd.*, v.kilometrage AS km_actuel
       FROM demande_deplacement dd
       LEFT JOIN vehicules v ON v.id = dd.vehicule_id
       WHERE dd.id = $1`,
      [req.params.id]
    );
    if (!current.rows[0])
      return res.status(404).json({ error: 'Demande introuvable.' });

    const dd = current.rows[0];
    if (dd.statut !== 'validee')
      return res.status(400).json({ error: 'Seules les demandes validées peuvent être clôturées.' });

    // Validation kilométrage
    if (km_depart && km_retour && Number(km_retour) < Number(km_depart))
      return res.status(400).json({ error: 'Le kilométrage de retour doit être supérieur au kilométrage de départ.' });

    const kmDistance = (km_depart && km_retour)
      ? Number(km_retour) - Number(km_depart)
      : null;

    // Clôturer la demande
    const r = await query(
      `UPDATE demande_deplacement
       SET statut               = 'terminee',
           km_depart            = $1,
           km_retour            = $2,
           date_retour_effective = CURRENT_DATE,
           heure_retour_reel    = CURRENT_TIME,
           date_modification    = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [km_depart || null, km_retour || null, req.params.id]
    );

    // Libérer le véhicule et mettre à jour son kilométrage
    if (dd.vehicule_id) {
      if (km_retour) {
        await query(
          `UPDATE vehicules
           SET statut      = 'disponible',
               kilometrage = $1
           WHERE id = $2`,
          [Number(km_retour), dd.vehicule_id]
        );
      } else {
        await query(
          `UPDATE vehicules SET statut = 'disponible' WHERE id = $1`,
          [dd.vehicule_id]
        );
      }
    }

    // Libérer le chauffeur
    if (dd.chauffeur_id) {
      await query(
        `UPDATE chauffeurs SET statut = 'disponible'
         WHERE id = $1 AND statut = 'en_mission'`,
        [dd.chauffeur_id]
      );
    }

    // ── Notification WhatsApp clôture (non bloquant) ───────────
    try {
      const empResult = await query(
        `SELECT e.prenoms, e.nom, e.telephone, c.nom AS commune_nom
         FROM employees e, communes c
         WHERE e.id = $1 AND c.id = $2`,
        [dd.employe_id, dd.commune_id]
      );
      const emp = empResult.rows[0];
      if (emp?.telephone) {
        await wa.notifyMissionCloturee({
          employe_name: `${emp.prenoms} ${emp.nom}`,
          telephone:    emp.telephone,
          communes:     [emp.commune_nom],
          date:         dd.date_deplacement,
          distance:     kmDistance,
        });
      }
    } catch (waErr) {
      console.error('[WhatsApp] Erreur notification clôture:', waErr.message);
    }

    res.json({
      data:     r.rows[0],
      distance: kmDistance,
      message:  'Mission clôturée avec succès.',
    });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, validate, reject, complete };
