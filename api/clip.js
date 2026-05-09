export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, duration, count, lang, platform, opts } = req.body;
  if (!url) return res.status(400).json({ error: 'URL manquante' });

  const GROQ_KEY = process.env.GROQ_API_KEY;

  const langNames = { fr:'français', en:'english', es:'español', ar:'arabe', pt:'português', de:'deutsch' };
  const platName = { all:'TikTok/Reels/Shorts', tiktok:'TikTok', reels:'Instagram Reels', shorts:'YouTube Shorts' };

  const system = `Tu es un expert en création de contenu viral pour les réseaux sociaux. Tu analyses des vidéos et génères des recommandations de clips optimisés.
Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

  const userMsg = `Analyse cette vidéo : ${url}

Paramètres demandés :
- Durée de chaque clip : ${duration} secondes
- Nombre de clips : ${count}
- Langue des sous-titres : ${langNames[lang]||lang}
- Plateforme cible : ${platName[platform]||platform}
- Options activées : ${JSON.stringify(opts)}

RÈGLE TRÈS IMPORTANTE pour les timestamps :
Tu dois OBLIGATOIREMENT répartir les ${count} clips sur TOUTE la durée de la vidéo.
- Si la vidéo dure 1h, répartis les clips toutes les ~10-12 minutes
- Si la vidéo dure 30min, répartis les clips toutes les ~5-6 minutes
- Si la vidéo dure 10min, répartis les clips toutes les ~2 minutes
- Chaque clip doit être dans une ZONE DIFFÉRENTE de la vidéo, jamais deux clips proches l'un de l'autre
- Exemple pour 5 clips sur 1h : 00:00→00:30, 12:00→12:30, 24:00→24:30, 36:00→36:30, 48:00→48:30
- Les timestamps doivent être réalistes et bien espacés
- Chaque clip doit durer exactement ${duration} secondes

Réponds avec ce JSON exact :
{
  "videoTitle": "titre de la vidéo basé sur l'URL",
  "channel": "nom de la chaîne si détectable",
  "duration": "durée estimée ex: 1:02:34",
  "views": "vues estimées ex: 1.2M",
  "thumbnail": null,
  "url": "${url}",
  "lang": "${lang.toUpperCase()}",
  "clips": [
    {
      "title": "titre accrocheur du clip en ${langNames[lang]||lang}",
      "start": "HH:MM:SS",
      "end": "HH:MM:SS",
      "score": "🔥 98%",
      "why": "Explication courte pourquoi ce moment est viral (1-2 phrases)",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
    }
  ],
  "hook": "Phrase d'accroche percutante pour les 3 premières secondes en ${langNames[lang]||lang}",
  "viralTitle": "Titre viral optimisé pour ${platName[platform]||platform} en ${langNames[lang]||lang}",
  "description": "Description complète optimisée SEO pour ${platName[platform]||platform} en ${langNames[lang]||lang} (3-4 phrases)",
  "hashtags": ["#hashtag1", "#hashtag2", "... 20 hashtags pertinents et tendance"],
  "music": ["Nom Artiste - Titre chanson tendance 1", "Nom Artiste - Titre 2", "Nom Artiste - Titre 3", "Nom Artiste - Titre 4", "Nom Artiste - Titre 5"]
}

Génère exactement ${count} clips BIEN RÉPARTIS sur toute la vidéo. Sois très créatif et viral dans les titres et hooks. Utilise des emojis pertinents.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 3000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg }
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Erreur Groq' });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    
    let result;
    try { result = JSON.parse(text); }
    catch { return res.status(500).json({ error: 'Réponse IA invalide' }); }

    res.status(200).json(result);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
