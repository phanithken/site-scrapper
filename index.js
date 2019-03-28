const Nightmare = require('nightmare')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const os = require('os')

const BASE_URL = 'https://www.cledepeau-beaute.com'
const nightmare = Nightmare({ show: false })

/** CSV */
const filename = path.join(__dirname, `output/${new Date().toISOString()}.csv`)
prepareCSVBlueprint()

/**
 * Just to make sure that the id list filename is well received
 */
if (process.argv.length < 3) {
    console.log('Usage: node ' + process.argv[1] + ' FILENAME')
    process.exit(1)
}

/**
 * Read id from id file list
 */
fs.readFile(process.argv[2], 'utf8', async function(err, data) {
    if (err) throw err
    var id_json = JSON.parse(data)
    var length = id_json.list.length
    for(var i=0; i<length; i++) {
        let scrapping_data = await appendfile(`${BASE_URL}/jp/${id_json.list[i]}.html`)
            .then(res => {
                return res
            })
            .then(html => {
                return getData(html, 'JP')
            })
            .then(async data => {
                let en_data = await appendfile(`${BASE_URL}/en/${id_json.list[i]}.html`)
                    .then(res => {
                        return res
                    })
                    .then(html => {
                        return getData(html, 'EN')
                    })
                return [...data, ...en_data]
            })
        
        writeToCSV(scrapping_data, id_json.list[i])
    }
    process.exit(0)
})

/**
 * 
 * @param {*} url 
 * @param {*} type 
 */
let appendfile = (url) => {
    return nightmare
        .goto(url)
        .wait('body')
        .evaluate(() => document.querySelector('body').innerHTML)
}

/**
 * 
 * @param {*} html 
 * @param {*} type 
 */
let getData = (html, type) => {
    data = []
    const $ = cheerio.load(html)
    $('div.c-block-shopingmodal-side-comment').each((i, elem) => {
        let detail  = type === 'JP' ? $(elem).find('p:nth-child(1)').text() : $(elem).find('p:nth-child(1)').html().includes('\n') ? $(elem).find('p:nth-child(1)').html().split('<br>')[0] : 'N/A'
        let price   = type === 'JP' ? $(elem).find('p:nth-child(2)').text() : 'N/A'
        let comment = type === 'JP' ? $(elem).find('p:nth-child(4)').text() : $(elem).find('p:nth-child(1)').html().includes('\n') ? $(elem).find('p:nth-child(1)').html().split('<br>')[1] : $(elem).find('p:nth-child(1)').text()

        data.push({
            type   : type,
            detail : detail.replace(/\n/g, '').replace(/,/g, ''),
            price  : price.replace(/\n/g, '').replace(/,/g, ''),
            comment: comment.replace(/\n/g, '').replace(/,/g, '')
        })
    })
    return data
}

/**
 * Prepare CSV blueprint
 */
function prepareCSVBlueprint() {
    const row = []
    const header = []
    row.push(',ID')
    row.push('Detail')
    row.push('Price')
    row.push('Comment')
    header.push(row.join())
    fs.writeFileSync(filename, header.join(os.EOL).concat('\n'))
}

/**
 * 
 * @param {*} data 
 */
let writeToCSV = (data, id) => {
    const length = data.length
    for (var i=0; i<length; i++) {
        console.log(`scraping ${id} ...`)
        const row = []
        row.push(data[i].type)
        row.push(`${id}`)
        row.push(data[i].detail)
        row.push(data[i].price)
        row.push(data[i].comment)
        fs.appendFileSync(filename, row.join().concat('\n'))
    }
}
  