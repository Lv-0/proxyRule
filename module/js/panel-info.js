/*
 * Surge 网络详情面板
 * 自用
 */
const { wifi, v4, v6 } = $network;

let cellularInfo = '';

const radioGeneration = {
    'GPRS': '2.5G',
    'CDMA1x': '2.5G',
    'EDGE': '2.75G',
    'WCDMA': '3G',
    'HSDPA': '3.5G',
    'CDMAEVDORev0': '3.5G',
    'CDMAEVDORevA': '3.5G',
    'CDMAEVDORevB': '3.75G',
    'HSUPA': '3.75G',
    'eHRPD': '3.9G',
    'LTE': '4G',
    'NRNSA': '5G',
    'NR': '5G',
};

const carrierNames = loadCarrierNames();
//流量接口
const TRAFFIC_URL = 'http://47.115.1.20:19999/getTraffic'

let trafficInfo = '';

//youtube
const BASE_URL_FOR_YOUTUBE = 'https://www.youtube.com/premium'
const DEFAULT_OPTIONS_YOUTUBE = {
    title: 'YouTube Premium :',
    availableContent: ' #REGION_FLAG# #REGION_NAME#',
    availableIcon: '',
    availableIconColor: '',
    availableStyle: 'good',
    notAvailableContent: '不支持 YouTube Premium',
    notAvailableIcon: '',
    notAvailableIconColor: '',
    notAvailableStyle: 'alert',
    errorContent: '检测失败，请重试',
    errorIcon: '',
    errorIconColor: '',
    errorStyle: 'error',
}
let options_youtube = getOptionsYouTube()
let panel_youtube = {
    title: options_youtube.title,
}

//netflix
const BASE_URL_FOR_NETFLIX = 'https://www.netflix.com/title/'
const FILM_ID = 81215567
const AREA_TEST_FILM_ID = 80018499
const DEFAULT_OPTIONS_NETFLIX = {
    title: 'Netflix :',
    fullContent: ' #REGION_FLAG# #REGION_NAME#',
    fullIcon: '',
    fullIconColor: '',
    fullStyle: 'good',
    onlyOriginalContent: '仅支持自制剧，#REGION_FLAG# #REGION_NAME#',
    onlyOriginalIcon: '',
    onlyOriginalIconColor: '',
    onlyOriginalStyle: 'info',
    notAvailableContent: '不支持 Netflix',
    notAvailableIcon: '',
    notAvailableIconColor: '',
    notAvailableStyle: 'alert',
    errorContent: '检测失败，请重试',
    errorIcon: '',
    errorIconColor: '',
    errorStyle: 'error',
}
let options_netflix = getOptionsNetflix()
let panel_netflix = {
    title: options_netflix.title,
}


if (!v4.primaryAddress && !v6.primaryAddress) {
    $done({
        title: '沒有网络',
        content: '尚未连接至网络\n请检查网络状态后重试',
        icon: 'wifi.exclamationmark',
        'icon-color': '#CB1B45',
    });
} else {
    if ($network['cellular-data']) {
        const carrierId = $network['cellular-data'].carrier;
        const radio = $network['cellular-data'].radio;
        if (carrierId && radio) {
            cellularInfo = carrierNames[carrierId] ?
                carrierNames[carrierId] + ' | ' + radioGeneration[radio] + ' - ' + radio :
                '蜂窝数据 | ' + radioGeneration[radio] + ' - ' + radio;
        }
    }
    $httpClient.get(TRAFFIC_URL, function (error, response, data) {
        trafficInfo = JSON.parse(data);
    })
    $httpClient.get('http://ip-api.com/json', function (error, response, data) {
        if (error) {
            $done({
                title: '发生错误',
                content: '无法获取目前网络信息\n请检查网络状态后重试',
                icon: 'wifi.exclamationmark',
                'icon-color': '#CB1B45',
            });
        }

        const info = JSON.parse(data);

        ;(async () => {
            //youtube
            await Promise.race([test_youtube(), timeout(10000)])
                .then(region => {
                    panel_youtube['content'] = replaceRegionPlaceholder(DEFAULT_OPTIONS_YOUTUBE.availableContent, region)
                })
                .catch(error => {
                    if (error !== 'Not Available') {
                        return Promise.reject(error)
                    }
                    panel_youtube['content'] = DEFAULT_OPTIONS_YOUTUBE.notAvailableContent
                })
            //netflix
            await Promise.race([test_netflix(FILM_ID), timeout(10000)])
                .then(async region => {
                    let content = DEFAULT_OPTIONS_NETFLIX.fullContent
                    if (content.indexOf('#REGION_FLAG#') !== -1) {
                        content.replaceAll('#REGION_FLAG#')
                    }

                    panel_netflix['content'] = replaceRegionPlaceholder(DEFAULT_OPTIONS_NETFLIX.fullContent, region)
                })
                .catch(async error => {
                    if (error !== 'Not Found') {
                        return Promise.reject(error)
                    }
                    if (
                        DEFAULT_OPTIONS_NETFLIX.onlyOriginalContent.indexOf('#REGION_FLAG#') === -1 &&
                        DEFAULT_OPTIONS_NETFLIX.onlyOriginalContent.indexOf('#REGION_CODE#') === -1 &&
                        DEFAULT_OPTIONS_NETFLIX.onlyOriginalContent.indexOf('#REGION_NAME#') === -1 &&
                        DEFAULT_OPTIONS_NETFLIX.onlyOriginalContent.indexOf('#REGION_NAME_EN#') === -1
                    ) {
                        panel_netflix['content'] = DEFAULT_OPTIONS_NETFLIX.onlyOriginalContent
                        return
                    }
                    let region = await Promise.race([test_netflix(AREA_TEST_FILM_ID), timeout(10000)])
                    panel_netflix['content'] = replaceRegionPlaceholder(DEFAULT_OPTIONS_NETFLIX.onlyOriginalContent, region)
                })
                .catch(error => {
                    if (error !== 'Not Available') {
                        return Promise.reject(error)
                    }
                    panel_netflix['content'] = DEFAULT_OPTIONS_NETFLIX.notAvailableContent
                })

        })()
            .catch(error => {
                console.log(error)
                panel_youtube['content'] = DEFAULT_OPTIONS_YOUTUBE.errorContent
                panel_netflix['content'] = DEFAULT_OPTIONS_NETFLIX.errorContent
            })
            .finally(() => {
                $done({
                    title: wifi.ssid ? wifi.ssid : cellularInfo,
                    content:
                        (v4.primaryAddress ? `IPv4 : ${v4.primaryAddress} \n` : '') +
                        (v6.primaryAddress ? `IPv6 : ${v6.primaryAddress}\n` : '') +
                        (v4.primaryRouter && wifi.ssid ? `Router IPv4 : ${v4.primaryRouter}\n` : '') +
                        (v6.primaryRouter && wifi.ssid ? `Router IPv6 : ${v6.primaryRouter}\n` : '') +
                        `Node IP : ${info.query}\n` +
                        `Node ISP : ${info.isp}\n` +
                        `Node Address : ${getFlagEmoji(info.countryCode)} | ${info.country} - ${info.city}\n` +
                        `Traffic : ${trafficInfo.data}\n` +
                        panel_youtube.title + panel_youtube.content + '\n' +
                        panel_netflix.title + panel_netflix.content,
                    icon: wifi.ssid ? 'wifi' : 'simcard',
                    'icon-color': wifi.ssid ? '#005CAF' : '#F9BF45',
                });
            })



    });
}

function getFlagEmoji(countryCode) {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map((char) => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

//youtube

function test_youtube() {
    return new Promise((resolve, reject) => {
        let option = {
            url: BASE_URL_FOR_YOUTUBE,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
                'Accept-Language': 'en',
            },
        }
        $httpClient.get(option, function (error, response, data) {
            if (error != null || response.status !== 200) {
                reject('Error')
                return
            }

            if (data.indexOf('Premium is not available in your country') !== -1) {
                reject('Not Available')
                return
            }

            let region = ''
            let re = new RegExp('"countryCode":"(.*?)"', 'gm')
            let result = re.exec(data)
            if (result != null && result.length === 2) {
                region = result[1]
            } else if (data.indexOf('www.google.cn') !== -1) {
                region = 'CN'
            } else {
                region = 'US'
            }
            resolve(region.toUpperCase())
        })
    })
}

function timeout(delay = 5000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject('Timeout')
        }, delay)
    })
}

function getCountryFlagEmoji(countryCode) {
    if (countryCode.toUpperCase() == 'TW') {
        countryCode = 'CN'
    }
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt())
    return String.fromCodePoint(...codePoints)
}

function getOptionsYouTube() {
    let options = Object.assign({}, DEFAULT_OPTIONS_YOUTUBE)
    if (typeof $argument != 'undefined') {
        try {
            let params = Object.fromEntries(
                $argument
                    .split('&')
                    .map(item => item.split('='))
                    .map(([k, v]) => [k, decodeURIComponent(v)])
            )
            Object.assign(options, params)
        } catch (error) {
            console.error(`$argument 解析失败，$argument: + ${argument}`)
        }
    }

    return options
}

function replaceRegionPlaceholder(content, region) {
    let result = content

    if (result.indexOf('#REGION_CODE#') !== -1) {
        result = result.replaceAll('#REGION_CODE#', region.toUpperCase())
    }
    if (result.indexOf('#REGION_FLAG#') !== -1) {
        result = result.replaceAll('#REGION_FLAG#', getCountryFlagEmoji(region.toUpperCase()))
    }

    if (result.indexOf('#REGION_NAME#') !== -1) {
        result = result.replaceAll('#REGION_NAME#', RESION_NAMES?.[region.toUpperCase()]?.chinese ?? '')
    }

    if (result.indexOf('#REGION_NAME_EN#') !== -1) {
        result = result.replaceAll('#REGION_NAME_EN#', RESION_NAMES?.[region.toUpperCase()]?.english ?? '')
    }

    return result
}


//netflix
function test_netflix(filmId) {
    return new Promise((resolve, reject) => {
        let option = {
            url: BASE_URL_FOR_NETFLIX + filmId,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
            },
        }
        $httpClient.get(option, function (error, response, data) {
            if (error != null) {
                reject(error)
                return
            }

            if (response.status === 403) {
                reject('Not Available')
                return
            }

            if (response.status === 404) {
                reject('Not Found')
                return
            }

            if (response.status === 200) {
                let url = response.headers['x-originating-url']
                let region = url.split('/')[3]
                region = region.split('-')[0]
                if (region == 'title') {
                    region = 'us'
                }
                resolve(region.toUpperCase())
                return
            }

            reject('Error')
        })
    })
}

function getOptionsNetflix() {
    let options = Object.assign({}, DEFAULT_OPTIONS_NETFLIX)
    if (typeof $argument != 'undefined') {
        try {
            let params = Object.fromEntries(
                $argument
                    .split('&')
                    .map(item => item.split('='))
                    .map(([k, v]) => [k, decodeURIComponent(v)])
            )
            Object.assign(options, params)
        } catch (error) {
            console.error(`$argument 解析失败，$argument: + ${argument}`)
        }
    }

    return options
}



// prettier-ignore
const RESION_NAMES={AF:{chinese:"阿富汗",english:"Afghanistan",},AL:{chinese:"阿尔巴尼亚",english:"Albania",},DZ:{chinese:"阿尔及利亚",english:"Algeria",},AO:{chinese:"安哥拉",english:"Angola",},AR:{chinese:"阿根廷",english:"Argentina",},AM:{chinese:"亚美尼亚",english:"Armenia",},AU:{chinese:"澳大利亚",english:"Australia",},AT:{chinese:"奥地利",english:"Austria",},AZ:{chinese:"阿塞拜疆",english:"Azerbaijan",},BH:{chinese:"巴林",english:"Bahrain",},BD:{chinese:"孟加拉国",english:"Bangladesh",},BY:{chinese:"白俄罗斯",english:"Belarus",},BE:{chinese:"比利时",english:"Belgium",},BZ:{chinese:"伯利兹",english:"Belize",},BJ:{chinese:"贝宁",english:"Benin",},BT:{chinese:"不丹",english:"Bhutan",},BO:{chinese:"玻利维亚",english:"Bolivia",},BA:{chinese:"波斯尼亚和黑塞哥维那",english:"Bosnia and Herzegovina",},BW:{chinese:"博茨瓦纳",english:"Botswana",},BR:{chinese:"巴西",english:"Brazil",},VG:{chinese:"英属维京群岛",english:"British Virgin Islands",},BN:{chinese:"文莱",english:"Brunei",},BG:{chinese:"保加利亚",english:"Bulgaria",},BF:{chinese:"布基纳法索",english:"Burkina-faso",},BI:{chinese:"布隆迪",english:"Burundi",},KH:{chinese:"柬埔寨",english:"Cambodia",},CM:{chinese:"喀麦隆",english:"Cameroon",},CA:{chinese:"加拿大",english:"Canada",},CV:{chinese:"佛得角",english:"Cape Verde",},KY:{chinese:"开曼群岛",english:"Cayman Islands",},CF:{chinese:"中非共和国",english:"Central African Republic",},TD:{chinese:"乍得",english:"Chad",},CL:{chinese:"智利",english:"Chile",},CN:{chinese:"中国",english:"China",},CO:{chinese:"哥伦比亚",english:"Colombia",},KM:{chinese:"科摩罗",english:"Comoros",},CG:{chinese:"刚果(布)",english:"Congo - Brazzaville",},CD:{chinese:"刚果(金)",english:"Congo - Kinshasa",},CR:{chinese:"哥斯达黎加",english:"Costa Rica",},HR:{chinese:"克罗地亚",english:"Croatia",},CY:{chinese:"塞浦路斯",english:"Cyprus",},CZ:{chinese:"捷克共和国",english:"Czech Republic",},DK:{chinese:"丹麦",english:"Denmark",},DJ:{chinese:"吉布提",english:"Djibouti",},DO:{chinese:"多米尼加共和国",english:"Dominican Republic",},EC:{chinese:"厄瓜多尔",english:"Ecuador",},EG:{chinese:"埃及",english:"Egypt",},SV:{chinese:"萨尔瓦多",english:"EI Salvador",},GQ:{chinese:"赤道几内亚",english:"Equatorial Guinea",},ER:{chinese:"厄立特里亚",english:"Eritrea",},EE:{chinese:"爱沙尼亚",english:"Estonia",},ET:{chinese:"埃塞俄比亚",english:"Ethiopia",},FJ:{chinese:"斐济",english:"Fiji",},FI:{chinese:"芬兰",english:"Finland",},FR:{chinese:"法国",english:"France",},GA:{chinese:"加蓬",english:"Gabon",},GM:{chinese:"冈比亚",english:"Gambia",},GE:{chinese:"格鲁吉亚",english:"Georgia",},DE:{chinese:"德国",english:"Germany",},GH:{chinese:"加纳",english:"Ghana",},GR:{chinese:"希腊",english:"Greece",},GL:{chinese:"格陵兰",english:"Greenland",},GT:{chinese:"危地马拉",english:"Guatemala",},GN:{chinese:"几内亚",english:"Guinea",},GY:{chinese:"圭亚那",english:"Guyana",},HT:{chinese:"海地",english:"Haiti",},HN:{chinese:"洪都拉斯",english:"Honduras",},HK:{chinese:"中国香港",english:"Hong Kong",},HU:{chinese:"匈牙利",english:"Hungary",},IS:{chinese:"冰岛",english:"Iceland",},IN:{chinese:"印度",english:"India",},ID:{chinese:"印度尼西亚",english:"Indonesia",},IR:{chinese:"伊朗",english:"Iran",},IQ:{chinese:"伊拉克",english:"Iraq",},IE:{chinese:"爱尔兰",english:"Ireland",},IM:{chinese:"马恩岛",english:"Isle of Man",},IL:{chinese:"以色列",english:"Israel",},IT:{chinese:"意大利",english:"Italy",},CI:{chinese:"科特迪瓦",english:"Ivory Coast",},JM:{chinese:"牙买加",english:"Jamaica",},JP:{chinese:"日本",english:"Japan",},JO:{chinese:"约旦",english:"Jordan",},KZ:{chinese:"哈萨克斯坦",english:"Kazakstan",},KE:{chinese:"肯尼亚",english:"Kenya",},KR:{chinese:"韩国",english:"Korea",},KW:{chinese:"科威特",english:"Kuwait",},KG:{chinese:"吉尔吉斯斯坦",english:"Kyrgyzstan",},LA:{chinese:"老挝",english:"Laos",},LV:{chinese:"拉脱维亚",english:"Latvia",},LB:{chinese:"黎巴嫩",english:"Lebanon",},LS:{chinese:"莱索托",english:"Lesotho",},LR:{chinese:"利比里亚",english:"Liberia",},LY:{chinese:"利比亚",english:"Libya",},LT:{chinese:"立陶宛",english:"Lithuania",},LU:{chinese:"卢森堡",english:"Luxembourg",},MO:{chinese:"中国澳门",english:"Macao",},MK:{chinese:"马其顿",english:"Macedonia",},MG:{chinese:"马达加斯加",english:"Madagascar",},MW:{chinese:"马拉维",english:"Malawi",},MY:{chinese:"马来西亚",english:"Malaysia",},MV:{chinese:"马尔代夫",english:"Maldives",},ML:{chinese:"马里",english:"Mali",},MT:{chinese:"马耳他",english:"Malta",},MR:{chinese:"毛利塔尼亚",english:"Mauritania",},MU:{chinese:"毛里求斯",english:"Mauritius",},MX:{chinese:"墨西哥",english:"Mexico",},MD:{chinese:"摩尔多瓦",english:"Moldova",},MC:{chinese:"摩纳哥",english:"Monaco",},MN:{chinese:"蒙古",english:"Mongolia",},ME:{chinese:"黑山共和国",english:"Montenegro",},MA:{chinese:"摩洛哥",english:"Morocco",},MZ:{chinese:"莫桑比克",english:"Mozambique",},MM:{chinese:"缅甸",english:"Myanmar(Burma)",},NA:{chinese:"纳米比亚",english:"Namibia",},NP:{chinese:"尼泊尔",english:"Nepal",},NL:{chinese:"荷兰",english:"Netherlands",},NZ:{chinese:"新西兰",english:"New Zealand",},NI:{chinese:"尼加拉瓜",english:"Nicaragua",},NE:{chinese:"尼日尔",english:"Niger",},NG:{chinese:"尼日利亚",english:"Nigeria",},KP:{chinese:"朝鲜",english:"North Korea",},NO:{chinese:"挪威",english:"Norway",},OM:{chinese:"阿曼",english:"Oman",},PK:{chinese:"巴基斯坦",english:"Pakistan",},PA:{chinese:"巴拿马",english:"Panama",},PY:{chinese:"巴拉圭",english:"Paraguay",},PE:{chinese:"秘鲁",english:"Peru",},PH:{chinese:"菲律宾",english:"Philippines",},PL:{chinese:"波兰",english:"Poland",},PT:{chinese:"葡萄牙",english:"Portugal",},PR:{chinese:"波多黎各",english:"Puerto Rico",},QA:{chinese:"卡塔尔",english:"Qatar",},RE:{chinese:"留尼旺",english:"Reunion",},RO:{chinese:"罗马尼亚",english:"Romania",},RU:{chinese:"俄罗斯",english:"Russia",},RW:{chinese:"卢旺达",english:"Rwanda",},SM:{chinese:"圣马力诺",english:"San Marino",},SA:{chinese:"沙特阿拉伯",english:"Saudi Arabia",},SN:{chinese:"塞内加尔",english:"Senegal",},RS:{chinese:"塞尔维亚",english:"Serbia",},SL:{chinese:"塞拉利昂",english:"Sierra Leone",},SG:{chinese:"新加坡",english:"Singapore",},SK:{chinese:"斯洛伐克",english:"Slovakia",},SI:{chinese:"斯洛文尼亚",english:"Slovenia",},SO:{chinese:"索马里",english:"Somalia",},ZA:{chinese:"南非",english:"South Africa",},ES:{chinese:"西班牙",english:"Spain",},LK:{chinese:"斯里兰卡",english:"Sri Lanka",},SD:{chinese:"苏丹",english:"Sudan",},SR:{chinese:"苏里南",english:"Suriname",},SZ:{chinese:"斯威士兰",english:"Swaziland",},SE:{chinese:"瑞典",english:"Sweden",},CH:{chinese:"瑞士",english:"Switzerland",},SY:{chinese:"叙利亚",english:"Syria",},TW:{chinese:"中国台湾",english:"Taiwan",},TJ:{chinese:"塔吉克斯坦",english:"Tajikstan",},TZ:{chinese:"坦桑尼亚",english:"Tanzania",},TH:{chinese:"泰国",english:"Thailand",},TG:{chinese:"多哥",english:"Togo",},TO:{chinese:"汤加",english:"Tonga",},TT:{chinese:"特立尼达和多巴哥",english:"Trinidad and Tobago",},TN:{chinese:"突尼斯",english:"Tunisia",},TR:{chinese:"土耳其",english:"Turkey",},TM:{chinese:"土库曼斯坦",english:"Turkmenistan",},VI:{chinese:"美属维尔京群岛",english:"U.S. Virgin Islands",},UG:{chinese:"乌干达",english:"Uganda",},UA:{chinese:"乌克兰",english:"Ukraine",},AE:{chinese:"阿拉伯联合酋长国",english:"United Arab Emirates",},GB:{chinese:"英国",english:"United Kiongdom",},US:{chinese:"美国",english:"USA",},UY:{chinese:"乌拉圭",english:"Uruguay",},UZ:{chinese:"乌兹别克斯坦",english:"Uzbekistan",},VA:{chinese:"梵蒂冈城",english:"Vatican City",},VE:{chinese:"委内瑞拉",english:"Venezuela",},VN:{chinese:"越南",english:"Vietnam",},YE:{chinese:"也门",english:"Yemen",},YU:{chinese:"南斯拉夫",english:"Yugoslavia",},ZR:{chinese:"扎伊尔",english:"Zaire",},ZM:{chinese:"赞比亚",english:"Zambia",},ZW:{chinese:"津巴布韦",english:"Zimbabwe",}}

function loadCarrierNames() {
    //整理邏輯:前三碼相同->後兩碼同電信->剩下的
    return {
        //台灣電信業者 Taiwan
        '466-11': '中華電信', '466-92': '中華電信',
        '466-01': '遠傳電信', '466-03': '遠傳電信',
        '466-97': '台灣大哥大', '466-89': '台灣之星', '466-05': 'GT',
        //中國電信業者 China
        '460-03': '中国电信', '460-05': '中国电信', '460-11': '中国电信',
        '460-01': '中国联通', '460-06': '中国联通', '460-09': '中国联通',
        '460-00': '中国移动', '460-02': '中国移动', '460-04': '中国移动', '460-07': '中国移动', '460-08': '中国移动',
        '460-15': '中国广电', '460-20': '中移铁通',
        //香港電信業者 HongKong
        '454-00': 'CSL', '454-02': 'CSL', '454-10': 'CSL', '454-18': 'CSL',
        '454-03': '3', '454-04': '3', '454-05': '3',
        '454-06': 'SMC HK', '454-15': 'SMC HK', '454-17': 'SMC HK',
        '454-09': 'CMHK', '454-12': 'CMHK', '454-13': 'CMHK', '454-28': 'CMHK', '454-31': 'CMHK',
        '454-16': 'csl.', '454-19': 'csl.', '454-20': 'csl.', '454-29': 'csl.',
        '454-01': '中信國際電訊', '454-07': 'UNICOM HK', '454-08': 'Truphone', '454-11': 'CHKTL', '454-23': 'Lycamobile',
        //日本電信業者 Japan
        '440-00': 'Y!mobile', '440-10': 'docomo', '440-11': 'Rakuten', '440-20': 'SoftBank',
        '440-50': ' au', '440-51': ' au', '440-52': ' au', '440-53': ' au', '440-54': ' au',
        '441-00': 'WCP', '441-10': 'UQ WiMAX',
        //韓國電信業者 Korea
        '450-03': 'SKT', '450-05': 'SKT',
        '450-02': 'KT', '450-04': 'KT', '450-08': 'KT',
        '450-06': 'LG U+', '450-10': 'LG U+',
        //美國電信業者 USA
        '310-030': 'AT&T', '310-070': 'AT&T', '310-150': 'AT&T', '310-170': 'AT&T', '310-280': 'AT&T', '310-380': 'AT&T', '310-410': 'AT&T', '310-560': 'AT&T', '310-680': 'AT&T', '310-980': 'AT&T',
        '310-160': 'T-Mobile', '310-200': 'T-Mobile', '310-210': 'T-Mobile', '310-220': 'T-Mobile', '310-230': 'T-Mobile', '310-240': 'T-Mobile', '310-250': 'T-Mobile', '310-260': 'T-Mobile', '310-270': 'T-Mobile', '310-300': 'T-Mobile', '310-310': 'T-Mobile', '310-660': 'T-Mobile', '310-800': 'T-Mobile', '311-660': 'T-Mobile', '311-882': 'T-Mobile', '311-490': 'T-Mobile', '312-530': 'T-Mobile', '311-870': 'T-Mobile', '311-880': 'T-Mobile',
        '310-004': 'Verizon', '310-010': 'Verizon', '310-012': 'Verizon', '310-013': 'Verizon', '311-110': 'Verizon', '311-270': 'Verizon', '311-271': 'Verizon', '311-272': 'Verizon', '311-273': 'Verizon', '311-274': 'Verizon', '311-275': 'Verizon', '311-276': 'Verizon', '311-277': 'Verizon', '311-278': 'Verizon', '311-279': 'Verizon', '311-280': 'Verizon', '311-281': 'Verizon', '311-282': 'Verizon', '311-283': 'Verizon', '311-284': 'Verizon', '311-285': 'Verizon', '311-286': 'Verizon', '311-287': 'Verizon', '311-288': 'Verizon', '311-289': 'Verizon', '311-390': 'Verizon', '311-480': 'Verizon', '311-481': 'Verizon', '311-482': 'Verizon', '311-483': 'Verizon', '311-484': 'Verizon', '311-485': 'Verizon', '311-486': 'Verizon', '311-487': 'Verizon', '311-488': 'Verizon', '311-489': 'Verizon', '310-590': 'Verizon', '310-890': 'Verizon', '310-910': 'Verizon',
        '310-120': 'Sprint',
        '310-850': 'Aeris Comm. Inc.', '310-510': 'Airtel Wireless LLC', '312-090': 'Allied Wireless Communications Corporation', '310-710': 'Arctic Slope Telephone Association Cooperative Inc.', '311-440': 'Bluegrass Wireless LLC', '311-800': 'Bluegrass Wireless LLC', '311-810': 'Bluegrass Wireless LLC', '310-900': 'Cable & Communications Corp.', '311-590': 'California RSA No. 3 Limited Partnership', '311-500': 'Cambridge Telephone Company Inc.', '310-830': 'Caprock Cellular Ltd.', '312-270': 'Cellular Network Partnership LLC', '312-280': 'Cellular Network Partnership LLC', '310-360': 'Cellular Network Partnership LLC', '311-120': 'Choice Phone LLC', '310-480': 'Choice Phone LLC', '310-420': 'Cincinnati Bell Wireless LLC', '310-180': 'Cingular Wireless', '310-620': 'Coleman County Telco /Trans TX', '310-06': 'Consolidated Telcom', '310-60': 'Consolidated Telcom', '310-700': 'Cross Valliant Cellular Partnership', '312-030': 'Cross Wireless Telephone Co.', '311-140': 'Cross Wireless Telephone Co.', '312-040': 'Custer Telephone Cooperative Inc.', '310-440': 'Dobson Cellular Systems', '310-990': 'E.N.M.R. Telephone Coop.', '312-120': 'East Kentucky Network LLC', '312-130': 'East Kentucky Network LLC', '310-750': 'East Kentucky Network LLC', '310-090': 'Edge Wireless LLC', '310-610': 'Elkhart TelCo. / Epic Touch Co.', '311-311': 'Farmers', '311-460': 'Fisher Wireless Services Inc.', '311-370': 'GCI Communication Corp.', '310-430': 'GCI Communication Corp.', '310-920': 'Get Mobile Inc.', '311-340': 'Illinois Valley Cellular RSA 2 Partnership', '312-170': 'Iowa RSA No. 2 Limited Partnership', '311-410': 'Iowa RSA No. 2 Limited Partnership', '310-770': 'Iowa Wireless Services LLC', '310-650': 'Jasper', '310-870': 'Kaplan Telephone Company Inc.', '312-180': 'Keystone Wireless LLC', '310-690': 'Keystone Wireless LLC', '311-310': 'Lamar County Cellular', '310-016': 'Leap Wireless International Inc.', '310-040': 'Matanuska Tel. Assn. Inc.', '310-780': 'Message Express Co. / Airlink PCS', '311-330': 'Michigan Wireless LLC', '310-400': 'Minnesota South. Wirel. Co. / Hickory', '311-010': 'Missouri RSA No 5 Partnership', '312-010': 'Missouri RSA No 5 Partnership', '311-020': 'Missouri RSA No 5 Partnership', '312-220': 'Missouri RSA No 5 Partnership', '311-920': 'Missouri RSA No 5 Partnership', '310-350': 'Mohave Cellular LP', '310-570': 'MTPCS LLC', '310-290': 'NEP Cellcorp Inc.', '310-34': 'Nevada Wireless LLC', '310-600': 'New-Cell Inc.', '311-300': 'Nexus Communications Inc.', '310-130': 'North Carolina RSA 3 Cellular Tel. Co.', '312-230': 'North Dakota Network Company', '311-610': 'North Dakota Network Company', '310-450': 'Northeast Colorado Cellular Inc.', '311-710': 'Northeast Wireless Networks LLC', '310-011': 'Northstar', '310-670': 'Northstar', '311-420': 'Northwest Missouri Cellular Limited Partnership', '310-760': 'Panhandle Telephone Cooperative Inc.', '310-580': 'PCS ONE', '311-170': 'PetroCom', '311-670': 'Pine Belt Cellular, Inc.', '310-100': 'Plateau Telecommunications Inc.', '310-940': 'Poka Lambro Telco Ltd.', '310-500': 'Public Service Cellular Inc.', '312-160': 'RSA 1 Limited Partnership', '311-430': 'RSA 1 Limited Partnership', '311-350': 'Sagebrush Cellular Inc.', '310-46': 'SIMMETRY', '311-260': 'SLO Cellular Inc / Cellular One of San Luis', '310-320': 'Smith Bagley Inc.', '316-011': 'Southern Communications Services Inc.', '310-740': 'Telemetrix Inc.', '310-14': 'Testing', '310-860': 'Texas RSA 15B2 Limited Partnership', '311-050': 'Thumb Cellular Limited Partnership', '311-830': 'Thumb Cellular Limited Partnership', '310-460': 'TMP Corporation', '310-490': 'Triton PCS', '312-290': 'Uintah Basin Electronics Telecommunications Inc.', '311-860': 'Uintah Basin Electronics Telecommunications Inc.', '310-960': 'Uintah Basin Electronics Telecommunications Inc.', '310-020': 'Union Telephone Co.', '311-220': 'United States Cellular Corp.', '310-730': 'United States Cellular Corp.', '311-650': 'United Wireless Communications Inc.', '310-003': 'Unknown', '310-15': 'Unknown', '310-23': 'Unknown', '310-24': 'Unknown', '310-25': 'Unknown', '310-26': 'Unknown', '310-190': 'Unknown', '310-950': 'Unknown', '310-38': 'USA 3650 AT&T', '310-999': 'Various Networks', '310-520': 'VeriSign', '310-530': 'West Virginia Wireless', '310-340': 'Westlink Communications, LLC', '311-070': 'Wisconsin RSA #7 Limited Partnership', '310-390': 'Yorkville Telephone Cooperative',
        //英國電信業者 UK
        '234-08': 'BT OnePhone UK','234-10': 'O2-UK','234-15': 'vodafone UK','234-20': '3','234-30': 'EE','234-33': 'EE','234-38': 'Virgin','234-50': 'JT','234-55': 'Sure','234-58': 'Manx Telecom',
        //菲律賓電信業者 Philippine
        '515-01': 'Islacom', '515-02': 'Globe', '515-03': 'Smart', '515-04': 'Sun', '515-08': 'Next Mobile', '515-18': 'Cure', '515-24': 'ABS-CBN',
        //越南電信業者 Vietnam
        '452-01': 'Mobifone', '452-02': 'VinaPhone', '452-03': 'S-Fone', '452-04': 'Viettel', '452-05': 'VietNamobile', '452-06': 'E-mobile', '452-07': 'Gmobile',
    };
}
