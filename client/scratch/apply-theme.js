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

replaceInFile(path.join(dir, 'components/layout/AppShell.tsx'), [
    [/bg-gradient-to-br from-\[#07050F\] via-\[#0E0A22\] to-\[#05030A\] text-slate-100/g, 'bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 text-slate-800'],
    [/bg-indigo-650\/5/g, 'bg-indigo-500/10'],
    [/bg-purple-650\/5/g, 'bg-purple-500/10'],
    [/bg-\[#14112c\]\/95/g, 'bg-white/95'],
    [/text-slate-100/g, 'text-slate-800'],
    [/text-slate-400/g, 'text-slate-500'],
    [/text-slate-200/g, 'text-slate-700'],
    [/border-white\/10/g, 'border-slate-200'],
    [/hover:bg-white\/5/g, 'hover:bg-slate-100']
]);

replaceInFile(path.join(dir, 'components/layout/AppSidebar.tsx'), [
    [/bg-\[#0E0A22\]\/40/g, 'bg-white/50'],
    [/border-white\/5/g, 'border-slate-200/50'],
    [/text-slate-400/g, 'text-slate-500'],
    [/hover:text-white/g, 'hover:text-indigo-600'],
    [/hover:bg-white\/5/g, 'hover:bg-indigo-50'],
    [/bg-\[#14112c\]\/95/g, 'bg-white/95'],
    [/text-slate-200/g, 'text-slate-800'],
    [/border-white\/10/g, 'border-slate-200/50']
]);

replaceInFile(path.join(dir, 'components/discord/DiscordHub.tsx'), [
    [/bg-\[#1e1f22\]/g, 'bg-slate-50/80'],
    [/border-\[#1e1f22\]/g, 'border-slate-200/50'],
    [/bg-\[#2b2d31\]/g, 'bg-white/60'],
    [/bg-\[#313338\]/g, 'bg-white'],
    [/bg-\[#383a40\]/g, 'bg-slate-100'],
    [/text-\[#f2f3f5\]/g, 'text-slate-800'],
    [/text-\[#dbdee1\]/g, 'text-slate-700'],
    [/text-\[#b5bac1\]/g, 'text-slate-500'],
    [/text-\[#949ba4\]/g, 'text-slate-400'],
    [/bg-\[#5865F2\]/g, 'bg-indigo-600'],
    [/border-white\/5/g, 'border-slate-200/50'],
    [/border-white\/10/g, 'border-slate-200'],
    [/bg-black\/60/g, 'bg-slate-900/40'],
    [/hover:bg-\[#4752C4\]/g, 'hover:bg-indigo-700'],
    [/hover:bg-\[#35373c\]/g, 'hover:bg-slate-100'],
    [/hover:bg-\[#3f4147\]/g, 'hover:bg-slate-50'],
    [/bg-\[#404249\]/g, 'bg-slate-100'],
    [/text-\[#00a8fc\]/g, 'text-indigo-500'],
    [/focus:border-\[#00a8fc\]/g, 'focus:border-indigo-500'],
    [/text-\[#ed4245\]/g, 'text-rose-500'],
    [/bg-\[#ed4245\]/g, 'bg-rose-500'],
    [/hover:bg-\[#ed4245\]/g, 'hover:bg-rose-500'],
    [/hover:bg-\[#da373c\]/g, 'hover:bg-rose-600'],
    [/border-\[#ed4245\]/g, 'border-rose-500']
]);

replaceInFile(path.join(dir, 'components/discord/BoardChatSidebar.tsx'), [
    [/bg-\[#2b2d31\]/g, 'bg-slate-50/80'],
    [/bg-\[#1e1f22\]/g, 'bg-slate-100/50'],
    [/bg-\[#313338\]/g, 'bg-white'],
    [/bg-\[#383a40\]/g, 'bg-slate-100'],
    [/text-\[#f2f3f5\]/g, 'text-slate-800'],
    [/text-\[#dbdee1\]/g, 'text-slate-700'],
    [/text-\[#b5bac1\]/g, 'text-slate-500'],
    [/text-\[#949ba4\]/g, 'text-slate-400'],
    [/border-\[#1e1f22\]/g, 'border-slate-200/50'],
    [/bg-\[#5865F2\]/g, 'bg-indigo-600'],
    [/hover:bg-\[#35373c\]/g, 'hover:bg-slate-100'],
    [/hover:bg-\[#404249\]/g, 'hover:bg-slate-100']
]);

replaceInFile(path.join(dir, 'app/invite/[code]/page.tsx'), [
    [/bg-gradient-to-br from-\[#0E0A22\] via-\[#050212\] to-\[#0A051B\]/g, 'bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50'],
    [/bg-\[#313338\]/g, 'bg-white'],
    [/border-white\/5/g, 'border-slate-200'],
    [/text-\[#f2f3f5\]/g, 'text-slate-800'],
    [/text-\[#b5bac1\]/g, 'text-slate-500'],
    [/text-\[#5865F2\]/g, 'text-indigo-600'],
    [/bg-\[#5865F2\]/g, 'bg-indigo-600'],
    [/hover:bg-\[#4752C4\]/g, 'hover:bg-indigo-700'],
    [/bg-\[#2b2d31\]/g, 'bg-slate-100'],
    [/shadow-\[#5865F2\]\/30/g, 'shadow-indigo-500/20'],
    [/shadow-\[#5865F2\]\/20/g, 'shadow-indigo-500/20'],
    [/rgba\(88,101,242,0.05\)/g, 'rgba(99,102,241,0.05)']
]);

replaceInFile(path.join(dir, 'app/layout.tsx'), [
    [/bg-gray-950 text-white/g, 'bg-slate-50 text-slate-800'],
    [/ antialiased dark/g, ' antialiased']
]);

console.log('Theme applied successfully.');
