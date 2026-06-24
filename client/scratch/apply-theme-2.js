const fs = require('fs');
const path = require('path');

const dir = 'e:/CodeAlpha_ProjectManagementTool/CodeAlpha_ProjectManagementTool-/client/src';

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [regex, replacement] of replacements) {
        content = content.replace(regex, replacement);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

replaceInFile(path.join(dir, 'app/dashboard/page.tsx'), [
    [/text-slate-100/g, 'text-slate-800'],
    [/text-slate-400/g, 'text-slate-500'],
    [/text-slate-200/g, 'text-slate-700'],
    [/text-slate-300/g, 'text-slate-600'],
    [/bg-white\/5/g, 'bg-slate-100'],
    [/border-white\/10/g, 'border-slate-200'],
    [/border-white\/5/g, 'border-slate-200'],
    [/bg-\[#13102c\]\/95/g, 'bg-white/95'],
    [/bg-\[#14112c\]\/60/g, 'bg-white/60'],
    [/bg-\[#14112c\]\/45/g, 'bg-white/45'],
    [/bg-\[#1a163a\]\/60/g, 'bg-slate-50/60'],
    [/text-slate-250/g, 'text-slate-800'],
    [/text-slate-450/g, 'text-slate-500'],
    [/bg-black\/60/g, 'bg-slate-900/40']
]);

replaceInFile(path.join(dir, 'components/discord/BoardChatSidebar.tsx'), [
    [/bg-slate-900\/60/g, 'bg-slate-50/60'],
    [/bg-slate-900/g, 'bg-slate-50'],
    [/border-slate-800\/40/g, 'border-slate-200'],
    [/border-slate-800/g, 'border-slate-200'],
    [/bg-slate-950\/40/g, 'bg-white/60'],
    [/bg-slate-950\/30/g, 'bg-white/40'],
    [/bg-slate-950\/20/g, 'bg-white/40'],
    [/bg-slate-950/g, 'bg-white'],
    [/border-slate-850/g, 'border-slate-200'],
    [/text-slate-200/g, 'text-slate-800'],
    [/text-slate-400/g, 'text-slate-500'],
    [/text-slate-300/g, 'text-slate-700'],
    [/text-slate-500/g, 'text-slate-500'],
    [/hover:bg-white\/10/g, 'hover:bg-slate-200'],
    [/hover:bg-white\/5/g, 'hover:bg-slate-100'],
    [/hover:text-white/g, 'hover:text-slate-800']
]);

console.log('Theme 2 applied successfully.');
