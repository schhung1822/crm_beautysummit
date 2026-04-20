import { readFileSync, writeFileSync } from 'fs';
let f = 'd:/Projects/zaui-uni/crm_beautysummit/src/app/(main)/votes/_components/data-table.tsx';
let content = readFileSync(f, 'utf-8');
content = content.replace('brandRatioData={brandRatioData}', 'brandRatioData={brandRatioData} leaderboardData={leaderboardData} voteOptions={initialVoteOptions}');
const leaderBoardCode = '\n  const leaderboardData = React.useMemo(() => {\n    const counts = new Map<string, number>();\n    filteredData.forEach((item) => {\n      const key = (item.brand_name || "Không rõ").trim();\n      counts.set(key, (counts.get(key) ?? 0) + 1);\n    });\n    return Array.from(counts.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);\n  }, [filteredData]);\n\n  const genderData';
content = content.replace('  const genderData', leaderBoardCode);
writeFileSync(f, content);