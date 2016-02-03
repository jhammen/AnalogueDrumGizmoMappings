
require('prototypes')
var fs = require('fs')
var builder = require('xmlbuilder')

var instruments = {}

function find(obj, prop) {
  var ret = obj[prop]
  if(!ret) { ret = obj[prop] = {} }
  return ret
}

function add_file(filename, channels, layer, inst, rr, art, vel) {
  var instobj = find(instruments, inst)
  // fix and find art
  if(art === "RS") { art = "CN" }
  var artobj = find(instobj, art)
  // velocity
  var velobj = find(artobj, vel)
  var layerobj = find(velobj,layer)
  if(!layerobj['files']) {
    layerobj['files'] = []
  }
  layerobj['files'].push(filename)
  layerobj['channels'] = channels
}

function add_folder(kit, folder, channels) {
  var wavFolder = "../../" + kit + "/Samples/" + folder
  var wavFiles = fs.readdirSync(wavFolder)
  wavFiles.sort().forEach(function(filename) {
    // AD25_CMSnareBRR01_XS_97_127
    var data = filename.match(/AD25_(\w{2})(\w+)RR(\d+)_(\w+)_(\d+_\d+)/)
    if(data) {
      add_file(filename, channels, data[1], data[2], data[3], data[4], data[5])
    }
    else {
      // AD25_OH_Crash1_BL_v02r02
      data = filename.match(/AD25_(\w{2})_(\w+)_(\w+)_v(\d+)r(\d+)/)
      if(data) {
        add_file(filename, channels, data[1], data[2], data[5], data[3], data[4])
      }
      else if(filename.endsWith(".wav")){
        console.log("line does not match: " + filename)
      }
    }
  })
}

function channelName(base, i, channels) {
  if(channels === 1) { return base }
  if(i === 1) { return base + "Left" }
  return base + "Right"
}

function fixVelocity(vel, parent) {
  var test = vel.indexOf('_')
  if(test > 0) { // type x_y
    var abs = vel.substring(test + 1)
    return (abs / 127).toFixed(2)
  }
  var max = 0
  for(other in parent) {
    max = Math.max(max, other)
  }
  process.stdout.write("max = " + max)
  return (vel / max).toFixed(2)
}

function makeFile(name, inst) {
  for(art in inst) {
    process.stdout.write(name.toLowerCase() + art + ".xml\n")
    var doc = builder.create("instrument")
    doc.att("version", "2.0")
    doc.att("name", name)
    var samples = doc.ele("samples")
    var velCount = 1
    for(var vel in inst[art]) {
      var velocity = fixVelocity(vel, inst[art])
      var velobj = inst[art][vel]
      for(var layer in velobj) {
        var layerobj = velobj[layer]
        var channels = layerobj['channels']
        var files = layerobj['files']
        for(var i = 0; i < 1; i++) {//files.length; i++) {
          var sample = samples.ele("sample")
          sample.att("name", name + velCount + "_" + (i+1))
          sample.att("power", velocity)
          for(var j = 1; j <= channels; j++) {
            var audiofile = sample.ele("audiofile")
            var channel = channelName(name + layer, j, channels)
            audiofile.att("channel", channel)
            audiofile.att("file", files[i])
            audiofile.att("filechannel", j)
          }
        }
      }
      velCount++
    }
    process.stdout.write(doc.toString({pretty: true}))
  }
}

add_folder("Plastique", "Close Mics", 1)
//add_folder("Plastique", "Overhead Mics", 2)
//add_folder("Plastique", "Room Mics", 2)

for(var key in instruments) {
  makeFile(key, instruments[key])
}
