const fs = require('fs');
const path = require('path');

const dir = 'e:/CodeAlpha_ProjectManagementTool/CodeAlpha_ProjectManagementTool-/client/src';

function replaceExactClass(content, lightClass, darkClass) {
    if (lightClass.includes(' ')) {
        // for multiple classes like gradient
        return content.replace(lightClass, `${lightClass} ${darkClass}`);
    }
    const regex = new RegExp(`(?<=[\\s"'\\\`])${lightClass.replace(/\//g, '\\/')}(?=[\\s"'\\\`])`, 'g');
    return content.replace(regex, `${lightClass} ${darkClass}`);
}

function processFile(filePath, classPairs) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [light, dark] of classPairs) {
        content = replaceExactClass(content, light, dark);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

const GLOBAL_TEXT_PAIRS = [
    ['text-slate-800', 'dark:text-slate-100'],
    ['text-slate-700', 'dark:text-slate-200'],
    ['text-slate-600', 'dark:text-slate-300'],
    ['text-slate-500', 'dark:text-slate-400'],
    ['border-slate-200/50', 'dark:border-white/5'],
    ['border-slate-200', 'dark:border-white/10'],
    ['bg-slate-100', 'dark:bg-white/5'],
    ['hover:bg-slate-100', 'dark:hover:bg-white/5'],
    ['hover:bg-slate-200', 'dark:hover:bg-white/10'],
    ['bg-white/95', 'dark:bg-[#14112c]/95'],
    ['bg-white/60', 'dark:bg-[#14112c]/60'],
    ['bg-white/50', 'dark:bg-[#0E0A22]/40'],
    ['bg-white/45', 'dark:bg-[#14112c]/45'],
    ['bg-white/40', 'dark:bg-[#14112c]/40'],
    ['bg-slate-50/60', 'dark:bg-[#1a163a]/60'],
    ['bg-slate-900/40', 'dark:bg-black/60']
];

const DISCORD_PAIRS = [
    ['bg-slate-50/80', 'dark:bg-[#1e1f22]'],
    ['bg-white/60', 'dark:bg-[#2b2d31]'],
    ['bg-white', 'dark:bg-[#313338]'],
    ['bg-slate-100', 'dark:bg-[#383a40]'],
    ['text-slate-800', 'dark:text-[#f2f3f5]'],
    ['text-slate-700', 'dark:text-[#dbdee1]'],
    ['text-slate-500', 'dark:text-[#b5bac1]'],
    ['text-slate-400', 'dark:text-[#949ba4]'],
    ['bg-indigo-600', 'dark:bg-[#5865F2]'],
    ['hover:bg-indigo-700', 'dark:hover:bg-[#4752C4]'],
    ['border-slate-200/50', 'dark:border-[#1e1f22]'],
    ['border-slate-200', 'dark:border-[#1e1f22]'],
    ['hover:bg-slate-100', 'dark:hover:bg-[#35373c]'],
    ['hover:bg-slate-50', 'dark:hover:bg-[#3f4147]']
];

processFile(path.join(dir, 'components/layout/AppShell.tsx'), [
    ['bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50', 'dark:from-[#07050F] dark:via-[#0E0A22] dark:to-[#05030A]'],
    ...GLOBAL_TEXT_PAIRS
]);

processFile(path.join(dir, 'components/layout/AppSidebar.tsx'), [
    ...GLOBAL_TEXT_PAIRS,
    ['hover:text-indigo-600', 'dark:hover:text-white'],
    ['hover:bg-indigo-50', 'dark:hover:bg-white/5']
]);

processFile(path.join(dir, 'app/dashboard/page.tsx'), GLOBAL_TEXT_PAIRS);

processFile(path.join(dir, 'components/discord/DiscordHub.tsx'), DISCORD_PAIRS);

processFile(path.join(dir, 'app/invite/[code]/page.tsx'), [
    ['bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50', 'dark:from-[#0E0A22] dark:via-[#050212] dark:to-[#0A051B]'],
    ...DISCORD_PAIRS
]);

processFile(path.join(dir, 'components/discord/BoardChatSidebar.tsx'), [
    ['bg-slate-50', 'dark:bg-slate-900'],
    ['border-slate-200', 'dark:border-slate-800'],
    ['bg-white/60', 'dark:bg-slate-950/40'],
    ['bg-white/40', 'dark:bg-slate-950/30'],
    ['bg-white', 'dark:bg-slate-950'],
    ['bg-slate-50/60', 'dark:bg-slate-900/60'],
    ['text-slate-800', 'dark:text-slate-200'],
    ['text-slate-500', 'dark:text-slate-400'],
    ['text-slate-700', 'dark:text-slate-300'],
    ['hover:bg-slate-200', 'dark:hover:bg-white/10'],
    ['hover:text-slate-800', 'dark:hover:text-white']
]);

console.log('Dark mode classes injected.');
