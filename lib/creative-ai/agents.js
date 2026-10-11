'use strict';
// Registry for authorized contract foundations; no live inference or unrelated agents are instantiated.
const strategist = require('./marketing-strategist');
const director = require('./creative-director');
const art = require('./art-director');
const graphic = require('./graphic-designer');
const reviewer = require('./creative-reviewer');
const producer = require('./workflow-producer');
const guardian = require('./brand-guardian');
const copy = require('./copywriter');
function getAgentContract(identifier) {
  const normalized = String(identifier).trim().toLowerCase().replace(/\s+/g, '-');
  for (const contract of [strategist,director,art,graphic,reviewer,producer,guardian,copy]) if (normalized === contract.agent.id || contract.agent.aliases.some(alias => alias.toLowerCase().replace(/\s+/g, '-') === normalized)) return contract;
  throw new Error(`No implemented Creative AI agent contract: ${identifier}`);
}
module.exports = { getAgentContract };
