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
let rows = (request.results ?? []).compactMap { result -> [String:Any]? in
 guard let candidate=result.topCandidates(1).first else {return nil}
 let box=result.boundingBox
 return ["text":candidate.string,"confidence":candidate.confidence,"box":["x":box.minX,"y":1-box.maxY,"width":box.width,"height":box.height]]
}
let data = try JSONSerialization.data(withJSONObject:["method":"Apple Vision accurate OCR","rows":rows], options:[.sortedKeys])
print(String(data:data,encoding:.utf8)!)
