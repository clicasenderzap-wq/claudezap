const PLAN_LIMITS = {
  starter:           { whatsapp_accounts: 3, contacts: 5000,     daily_messages: 1000 },
  pro:               { whatsapp_accounts: 6, contacts: Infinity,  daily_messages: 5000 },
  starter_cortesia:  { whatsapp_accounts: 3, contacts: 5000,     daily_messages: 1000 },
  pro_cortesia:      { whatsapp_accounts: 6, contacts: Infinity,  daily_messages: 5000 },
};

function getLimit(plan, resource) {
  return PLAN_LIMITS[plan]?.[resource] ?? PLAN_LIMITS.starter[resource];
}

// Blocks access if trial expired or account inactive
function requireActive(req, res, next) {
  const u = req.user;
  if (u.status === 'inactive') {
    return res.status(403).json({ error: 'Conta inativa. Entre em contato com o suporte.' });
  }
  if (u.status === 'trial' && u.trial_ends_at && new Date(u.trial_ends_at) < new Date()) {
    return res.status(403).json({ error: 'Período de teste encerrado. Assine um plano para continuar.' });
  }
  next();
}

// Factory: checks a count against the plan limit before creating a resource
function limitCheck(resource, countFn) {
  return async (req, res, next) => {
    const limit = getLimit(req.user.plan, resource);
    if (limit === Infinity) return next();
    const count = await countFn(req);
    if (count >= limit) {
      return res.status(403).json({
        error: `Limite do seu plano atingido (${limit} ${resource.replace('_', ' ')}). Faça upgrade para continuar.`,
      });
    }
    next();
  };
}

const ADMIN_EMAIL = 'clicasenderzap@gmail.com';

function requireAdmin(req, res, next) {
  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Acesso restrito a administradores' });
  next();
}

function requireProBot(req, res, next) {
  if (!['pro', 'pro_cortesia'].includes(req.user.plan)) {
    return res.status(403).json({ error: 'O Bot de Atendimento com IA é exclusivo do plano Pro. Faça upgrade para acessar.' });
  }
  next();
}

module.exports = { requireActive, limitCheck, requireAdmin, requireProBot, getLimit, PLAN_LIMITS };
