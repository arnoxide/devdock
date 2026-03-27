const fs = require('fs')
const path = require('path')
const os = require('os')

const DATA_DIR = path.join(os.homedir(), '.devdock')
const DATA_FILE = path.join(DATA_DIR, 'data.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

module.exports = {
  get(key, defaultValue) {
    const data = load()
    return key in data ? data[key] : defaultValue
  },
  set(key, value) {
    const data = load()
    data[key] = value
    save(data)
  }
}
