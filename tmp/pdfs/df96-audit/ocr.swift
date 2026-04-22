import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
let url = URL(fileURLWithPath: path)
let image = NSImage(contentsOf: url)!
var rect = NSRect(origin: .zero, size: image.size)
let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])
for obs in request.results ?? [] {
    guard let top = obs.topCandidates(1).first else { continue }
    print(top.string)
}
