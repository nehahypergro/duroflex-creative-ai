"""Offline schema authoring helper; no external dependency."""
import json
from pathlib import Path
root=Path(__file__).parent
def obj(properties,required=None,extra=False): return dict(type='object',properties=properties,required=required or list(properties),additionalProperties=extra)
def arr(items): return dict(type='array',items=items)
string={'type':'string','minLength':1}
number={'type':'number','exclusiveMinimum':0}
integer={'type':'integer','minimum':1}
nullable_date={'type':['string','null'],'format':'date'}
strings=arr(string)
size=obj({'value':number,'unit':{'enum':['B','KB','MB']},'byteBase':{'enum':[None,1000,1024]},'exclusive':{'type':'boolean'}},['value','unit','byteBase'])
check=obj({'method':{'enum':['dimensions','file','asset-count','native','scalar','rendered-review','semantic-review','metadata-review','job-input']},'slot':string,'field':string,'path':string,'exact':arr(integer),'allowedSizes':arr(arr(integer)),'min':{'oneOf':[{'type':'number'},arr(integer)]},'max':{'oneOf':[{'type':'number'},arr(integer)]},'ratios':arr(number),'ratioTolerance':number,'recommended':arr(integer),'maxMegapixels':number,'formats':strings,'rejectedFormats':strings,'maxSize':size,'minItems':{'type':'integer','minimum':0},'maxItems':integer,'maxChars':{'type':['integer','null'],'minimum':1},'countMethod':string,'allowedSchemes':strings,'readingPolicy':{'type':'object'},'minShortItems':integer,'shortMaxChars':integer},['method'])
source=obj({'id':string,'title':string,'url':string,'publisher':string,'authority':{'enum':['primary','editorial','user']},'accessStatus':{'enum':['verified-content','verified-search-excerpt','unavailable','editorial','user-provided']},'accessCheckedAt':{'type':'string','format':'date'},'verifiedAt':nullable_date,'sourceVersion':string,'section':{'type':'string'},'summary':{'type':'string'},'limitations':{'type':'string'}},['id','title','url','publisher','authority','accessStatus','accessCheckedAt','verifiedAt','sourceVersion','limitations'])
rule=obj({'id':string,'version':string,'tier':{'enum':['mandatory','official-guidance','heuristic']},'severity':{'enum':['error','warning','advisory']},'sourceIds':strings,'statement':string,'scope':obj({'profileIds':strings}),'check':check,'verifiedAt':nullable_date,'versionDate':{'type':'string','format':'date'},'confidence':string,'evidenceStatus':{'enum':['verified-primary','verified-excerpt','editorial-heuristic','unknown','source-conflict','user-specified']},'rationale':string,'limits':string})
for tier,severity in [('mandatory','error'),('official-guidance','warning'),('heuristic','advisory')]:
    rule.setdefault('allOf',[]).append({'if':{'properties':{'tier':{'const':tier}}},'then':{'properties':{'severity':{'const':severity}}}})
asset=obj({'slot':string,'role':string,'embeddedText':{'enum':['allowed','discouraged','inherent-only','promotional-forbidden']},'required':{'type':'boolean'}})
native=obj({'id':string,'required':{'type':['boolean','null']},'role':string,'embedded':{'const':False},'platformSupplied':{'type':'boolean'}},['id','required','role','embedded'])
canvas=obj({'width':number,'height':number,'unit':{'enum':['px','mm','in']},'ratio':number,'certification':string},['width','height','unit'])
profile=obj({**{k:string for k in ['id','version','family','channel','platform','publisher','placement','assetType','name','market','notes','useCase','certification']},'notes':{'type':'string'},'coverageStatus':{'enum':['included','conditional','unavailable']},'verifiedAt':{'type':'string','format':'date'},'assets':arr(asset),'nativeFields':arr(native),'ruleIds':strings,'unknowns':strings,'requiredJobInputs':strings,'sourceIds':strings,'contentVerifiedAt':nullable_date,'verificationNote':string,'canvas':canvas},['id','version','family','channel','platform','publisher','placement','assetType','name','market','coverageStatus','verifiedAt','assets','nativeFields','ruleIds','unknowns','requiredJobInputs','sourceIds','notes','useCase','certification'])
catalog=obj({'schemaVersion':{'const':1},'version':string,'verifiedAt':{'type':'string','format':'date'},'profiles':arr(profile),'rules':arr(rule),'sources':arr(source),'sourceConflicts':arr(obj({'id':string,'sourceIds':strings,'resolution':string}))})
custom_native=obj({'id':string,'required':{'type':['boolean','null']},'role':string,'maxChars':integer,'countMethod':{'enum':['unicode-code-points','utf16-code-units','grapheme-clusters','unspecified']}},['id','required'])
custom_native['dependentRequired']={'maxChars':['countMethod']}
custom=obj({'rows':arr(obj({**{k:string for k in ['id','name','platform','publisher','placement','assetType','channel','market','useCase']},'canvas':canvas,'nativeFields':arr(custom_native),'exportContract':obj({'formats':strings,'maxBytes':integer},['formats'])},['id','name','platform','publisher','placement','assetType','canvas'])),'source':obj({'id':{'type':'string','pattern':'^user:'},'title':string,'url':string,'verifiedAt':{'type':'string','format':'date'},'limitations':{'type':'string'}},['id','title','url','verifiedAt']),'version':string},['rows','source'])
pin=obj({k:string for k in ['profileId','profileVersion','catalogVersion','catalogDigest']})
for name,schema in [('catalog.schema.json',catalog),('custom-import.schema.json',custom),('pin.schema.json',pin)]:
    schema={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'urn:creative-ai:placement-knowledge:'+name,**schema}
    (root/name).write_text(json.dumps(schema,indent=2)+'\n')
