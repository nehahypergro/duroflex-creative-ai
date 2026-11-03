import Foundation
import Vision
import AppKit
let file = CommandLine.arguments[1]
let handler = VNImageRequestHandler(url: URL(fileURLWithPath:file), options: [:])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.minimumTextHeight = 0.005
try handler.perform([request])
let phrases: [String] = CommandLine.arguments.count > 2 ? (try JSONDecoder().decode([String].self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[2])))) : []
var rows = (request.results ?? []).compactMap { result -> [String:Any]? in
 guard let candidate=result.topCandidates(1).first else {return nil}
 let box=result.boundingBox
 return ["text":candidate.string,"confidence":candidate.confidence,"box":["x":box.minX,"y":1-box.maxY,"width":box.width,"height":box.height]]
}
// Exact substring bounds exclude decorative arrows while retaining multi-line rows.
if !phrases.isEmpty {
 rows = (request.results ?? []).flatMap { result -> [[String:Any]] in
  guard let candidate=result.topCandidates(1).first else {return []}
  var matches:[[String:Any]]=[]
  for phrase in Set(phrases) {
   if let range=candidate.string.range(of:phrase), let bound=try? candidate.boundingBox(for:range) {
    let b=bound.boundingBox
    matches.append(["text":phrase,"sourceText":candidate.string,"confidence":candidate.confidence,"box":["x":b.minX,"y":1-b.maxY,"width":b.width,"height":b.height]])
   }
  }
  if !matches.isEmpty {return matches}
  let b=result.boundingBox
  return [["text":candidate.string,"confidence":candidate.confidence,"box":["x":b.minX,"y":1-b.maxY,"width":b.width,"height":b.height]]]
 }
}
let data = try JSONSerialization.data(withJSONObject:["method":"Apple Vision accurate OCR","rows":rows], options:[.sortedKeys])
print(String(data:data,encoding:.utf8)!)
