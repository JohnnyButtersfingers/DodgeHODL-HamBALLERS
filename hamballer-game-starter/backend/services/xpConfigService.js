const { supabase } = require('../config/database');

const DEFAULT_THRESHOLDS = { epic: 1000, legendary: 2000 };

async function getXPThresholds() {
  if (!supabase) {
    return DEFAULT_THRESHOLDS;
  }

  const { data, error } = await supabase
    .from('xp_thresholds')
    .select('tier, min_xp');

  if (error) {
    console.error('DB error fetching thresholds:', error.message);
    return DEFAULT_THRESHOLDS;
  }

  const result = { ...DEFAULT_THRESHOLDS };
  for (const row of data) {
    result[row.tier] = row.min_xp;
  }
  return result;
}

async function setXPThreshold(tier, minXp) {
  if (!supabase) {
    console.log('Mock setXPThreshold', tier, minXp);
    return { tier, min_xp: minXp };
  }

  const { data, error } = await supabase
    .from('xp_thresholds')
    .upsert({ tier, min_xp: minXp }, { onConflict: 'tier' })
    .select()
    .single();

  if (error) {
    console.error('DB error updating threshold:', error.message);
    throw error;
  }

  return data;
}

module.exports = { getXPThresholds, setXPThreshold };

