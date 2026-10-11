'use strict';
// Deliberately non-networked adapter boundary. No credentials are read and no generation is performed.
const status=require('./provider.json');
async function generate() {return {status:'configuration-pending',generationStatus:'not-run',reason:'Provider adapter, account access and request size validation have not been configured.',provider:structuredClone(status)};}
module.exports={status,generate};
