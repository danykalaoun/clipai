export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, duration, count, lang, platform, opts, niche, transcription } = req.body;
  if (!url) return res.status(400).json({ error: 'URL manquante' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const langNames = { fr:'français', en:'english', es:'español', ar:'arabe', pt:'português', de:'deutsch' };
  const platName = { all:'TikTok/Reels/Shorts', tiktok:'TikTok', reels:'Instagram Reels', shorts:'YouTube Shorts' };
  const nicheContext = niche && niche !== 'general' ? `Niche/domaine : ${niche}. Adapte TOUS les titres, hooks et hashtags à cette niche spécifiquement.` : '';
  const transContext = transcription ? `\n\nTranscription/Description fournie par l'utilisateur :\n${transcription.slice(0,2000)}\n\nUtilise cette transcription pour identifier les moments les plus forts et générer des timestamps précis.` : '';

  const system = `Tu es le meilleur expert mondial en création de contenu viral pour TikTok, Instagram Reels et YouTube Shorts. Tu génères des analyses ultra-précises et des recommandations qui font exploser l'engagement.
Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, jamais.`;

  const userMsg = `Analyse cette vidéo et génère ${count} clips viraux : ${url}
${transContext}

Paramètres :
- Durée de chaque clip : ${duration} secondes exactement
- Nombre de clips : ${count}
- Langue : ${langNames[lang]||lang}
- Plateforme : ${platName[platform]||platform}
- Options : ${JSON.stringify(opts)}
${nicheContext}

RÈGLES OBLIGATOIRES :
1. Répartis les ${count} clips UNIFORMÉMENT sur toute la durée de la vidéo. Si 1h → clips toutes les ~12min. Si 30min → toutes les ~6min. Jamais 2 clips proches.
2. Chaque clip dure EXACTEMENT ${duration} secondes (end = start + ${duration}s)
3. Timestamps au format HH:MM:SS
4. Génère 3 variantes de titre pour chaque clip (pour A/B test)
5. Score d'engagement de 0 à 100 avec explication détaillée
6. Meilleurs jours/heures de publication pour chaque plateforme

JSON à retourner :
{
  "videoTitle": "titre détecté depuis l'URL",
  "channel": "chaîne détectée",
  "duration": "durée estimée HH:MM:SS",
  "views": "vues estimées",
  "url": "${url}",
  "lang": "${lang.toUpperCase()}",
  "niche": "${niche||'général'}",
  "clips": [
    {
      "title": "titre principal accrocheur avec emoji en ${langNames[lang]||lang}",
      "titleVariants": ["variante A courte", "variante B question", "variante C chiffre/stat"],
      "start": "00:00:00",
      "end": "00:00:${String(duration).padStart(2,'0')}",
      "score": 95,
      "scoreExplanation": "Explication du score : pourquoi ce moment est viral",
      "why": "Pourquoi ce clip va exploser (1-2 phrases percutantes)",
      "hook": "Phrase d'accroche pour les 3 premières secondes",
      "hashtags": ["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5","#hashtag6"],
      "bestTime": "Meilleur moment pour publier ex: Mardi 18h-20h"
    }
  ],
  "globalHook": "Hook global ultra-percutant en ${langNames[lang]||lang}",
  "viralTitle": "Titre viral principal pour ${platName[platform]||platform}",
  "description": "Description SEO complète pour ${platName[platform]||platform} en ${langNames[lang]||lang}",
  "hashtags": ["20 hashtags globaux tendance"],
  "music": ["Artiste - Titre 1","Artiste - Titre 2","Artiste - Titre 3","Artiste - Titre 4","Artiste - Titre 5"],
  "publishCalendar": {
    "tiktok": "Mardi, Jeudi, Vendredi — 18h-21h",
    "instagram": "Lundi, Mercredi, Samedi — 11h-13h ou 19h-21h",
    "youtube": "Mercredi, Vendredi — 14h-16h"
  },
  "contentTips": ["Conseil viral 1 spécifique à la niche","Conseil 2","Conseil 3"]
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
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
