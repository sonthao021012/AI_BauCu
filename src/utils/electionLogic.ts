export interface KnowledgeItem {
  id: string;
  topic: string;
  content: string;
  source?: string;
  createdAt?: number | string | unknown;
  updatedAt?: number | string | unknown;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AdminCommandResult {
  action: 'none' | 'add' | 'update' | 'delete';
  targetId?: string;
  topic?: string;
  content?: string;
  reply: string;
}

export const OFFICIAL_BOOK_DATA: KnowledgeItem[] = [
  {
    id: 'official-1',
    topic: 'Nguyên tắc bầu cử',
    content:
      'Việc bầu cử đại biểu Quốc hội và đại biểu Hội đồng nhân dân được tiến hành theo nguyên tắc phổ thông, bình đẳng, trực tiếp và bỏ phiếu kín.',
    source: 'Luật Bầu cử',
  },
  {
    id: 'official-2',
    topic: 'Tuổi bầu cử và ứng cử',
    content:
      'Tính đến ngày bầu cử được công bố, công dân nước Cộng hòa xã hội chủ nghĩa Việt Nam đủ mười tám (18) tuổi trở lên có quyền bầu cử và đủ hai mươi mốt (21) tuổi trở lên có quyền ứng cử.',
    source: 'Luật Bầu cử',
  },
  {
    id: 'official-3',
    topic: 'Ngày bầu cử',
    content:
      'Ngày bầu cử đại biểu Quốc hội và đại biểu Hội đồng nhân dân các cấp nhiệm kỳ 2026 - 2031 là ngày Chủ nhật, 10/03/2026. Thời gian bỏ phiếu bắt đầu từ 07 giờ sáng đến 19 giờ tối cùng ngày.',
    source: 'Hội đồng Bầu cử Quốc gia',
  },
  {
    id: 'official-4',
    topic: 'Cách gạch phiếu bầu',
    content:
      'Cử tri gạch ngang cả họ và tên những người mà mình không bầu; không khoanh tròn; không được viết thêm, không được ghi tên người ngoài danh sách ứng cử vào phiếu bầu; không để số người được bầu nhiều hơn số lượng đại biểu đã ấn định.',
    source: 'Hướng dẫn Bầu cử',
  },
  {
    id: 'official-5',
    topic: 'Địa điểm bỏ phiếu tại Phường Hội An Đông',
    content:
      'Cử tri phường Hội An Đông bỏ phiếu tại các Khu vực bỏ phiếu đặt tại Nhà văn hóa các khối phố nơi cử tri đăng ký thường trú hoặc tạm trú. Danh sách cử tri và khu vực bỏ phiếu được niêm yết công khai tại trụ sở UBND phường Hội An Đông và các nhà văn hóa khối phố.',
    source: 'UBND Phường Hội An Đông',
  },
  {
    id: 'official-6',
    topic: 'Thẻ cử tri và giấy tờ mang theo',
    content:
      'Khi đi bầu cử, cử tri cần xuất trình Thẻ cử tri. Trường hợp cử tri ốm đau, già yếu, khuyết tật không thể đến phòng bỏ phiếu được thì Tổ bầu cử sẽ mang hòm phiếu phụ và phiếu bầu đến tận nơi ở để cử tri nhận phiếu và thực hiện quyền bầu cử.',
    source: 'Hướng dẫn Bầu cử',
  },
];

export function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchKnowledgeBase(
  items: KnowledgeItem[],
  query: string
): KnowledgeItem[] {
  const cleanQuery = normalizeVietnamese(query);
  if (!cleanQuery) return items;

  const stopWords = new Set([
    'toi',
    'o',
    'thi',
    'la',
    'gi',
    'khi',
    'nao',
    'dau',
    'nhu',
    'the',
    'co',
    'duoc',
    'khong',
    'cho',
    'hoi',
    've',
    'cua',
    'va',
  ]);

  const tokens = cleanQuery
    .split(' ')
    .filter((t) => t.length > 1 && !stopWords.has(t));

  // Expand common Vietnamese election query synonyms
  const expandedTokens = [...tokens];
  if (
    cleanQuery.includes('lich') ||
    cleanQuery.includes('khi nao') ||
    cleanQuery.includes('thoi gian') ||
    cleanQuery.includes('ngay nao')
  ) {
    expandedTokens.push('ngay', '10', '03', '2026', 'chu nhat');
  }
  if (cleanQuery.includes('o dau') || cleanQuery.includes('cho nao')) {
    expandedTokens.push('dia', 'diem', 'khu', 'vuc', 'nha', 'van', 'hoa');
  }

  const scored = items.map((item) => {
    const normTopic = normalizeVietnamese(item.topic);
    const normContent = normalizeVietnamese(item.content);
    let score = 0;

    if (normTopic.includes(cleanQuery)) score += 15;
    if (normContent.includes(cleanQuery)) score += 8;

    for (const token of expandedTokens) {
      if (normTopic.includes(token)) score += 4;
      if (normContent.includes(token)) score += 2;
    }

    return { item, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

export function answerFromKnowledgeBaseFallback(
  userQuery: string,
  knowledgeBase: KnowledgeItem[]
): string {
  const matches = searchKnowledgeBase(knowledgeBase, userQuery);
  if (matches.length > 0) {
    const top = matches[0];
    const extra =
      matches.length > 1
        ? `\n\n📌 **Thông tin liên quan (${matches[1].topic}):** ${matches[1].content}`
        : '';
    return `🇻🇳 Theo dữ liệu bầu cử Phường Hội An Đông về **${top.topic}**:\n\n🗳️ ${top.content}${extra}\n\n✨ Nếu cần hỗ trợ thêm, bạn cứ hỏi tiếp hoặc liên hệ trực tiếp UBND phường Hội An Đông nhé!`;
  }

  return `🇻🇳 Cảm ơn câu hỏi của bạn! Hiện tại thông tin chi tiết về nội dung này chưa có sẵn trong cẩm nang trực tuyến.\n\n🗳️ Bạn có thể tham khảo các chủ đề chính như: **Ngày bầu cử**, **Nguyên tắc bầu cử**, **Cách gạch phiếu bầu**, **Địa điểm bỏ phiếu**, hoặc liên hệ trực tiếp **UBND phường Hội An Đông** để được hướng dẫn chính xác nhất nhé! ✨`;
}

export function simplifyTextFallback(complexText: string): string {
  const norm = normalizeVietnamese(complexText);
  if (norm.includes('nguyen tac') || norm.includes('pho thong')) {
    return 'Nói dễ hiểu là: Ai đủ 18 tuổi đều được đi bầu (phổ thông), lá phiếu của mọi người có giá trị ngang nhau (bình đẳng), tự tay mình đi bỏ phiếu chứ không nhờ người khác bầu thay (trực tiếp), và phiếu của mình bầu ai thì chỉ mình biết thôi (bỏ phiếu kín) ạ! 😊';
  }
  if (norm.includes('gach') || norm.includes('phieu bau')) {
    return 'Bà cứ nhớ mẹo nhỏ này nha: Không ưng ai thì lấy bút gạch một đường ngang thẳng qua cả họ và tên người đó. Đừng khoanh tròn, đừng viết thêm tên người khác vào phiếu là phiếu hợp lệ ngay ạ! ✍️✨';
  }
  if (norm.includes('10 03 2026') || norm.includes('ngay bau cu')) {
    return 'Ngày hội đi bầu cử là Chủ nhật, ngày 10 tháng 3 năm 2026 (từ 7 giờ sáng tới 7 giờ tối). Bà nhớ mang theo Thẻ cử tri đi sớm cho mát mẻ nhé! 🗓️🇻🇳';
  }
  if (norm.includes('dia diem') || norm.includes('hoi an dong')) {
    return 'Mình ở khối phố nào thuộc phường Hội An Đông thì cứ ghé Nhà văn hóa của khối phố đó để bỏ phiếu. Nếu đi lại khó khăn thì các cô chú trong Tổ bầu cử sẽ mang thùng phiếu phụ tới tận nhà hỗ trợ mình luôn ạ! 🏡❤️';
  }

  const clean = complexText
    .replace(/^[🇻🇳🗳️✨📌\s*]+/g, '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .slice(0, 2)
    .join(' ');
  return `Hiểu một cách thật giản dị, gần gũi là: ${clean} — Bà con cứ mang Thẻ cử tri đến điểm bỏ phiếu tại nhà văn hóa khối phố sẽ có cán bộ hướng dẫn tận tình từng bước ạ! 😊🇻🇳`;
}

const QUIZ_BANK: QuizQuestion[] = [
  {
    question:
      'Ngày bầu cử đại biểu Quốc hội và HĐND các cấp nhiệm kỳ 2026 - 2031 diễn ra vào ngày nào?',
    options: [
      'Chủ nhật, ngày 10/03/2026',
      'Thứ bảy, ngày 15/03/2026',
      'Chủ nhật, ngày 01/05/2026',
      'Thứ hai, ngày 02/09/2026',
    ],
    correctIndex: 0,
    explanation:
      'Theo quy định, ngày bầu cử đại biểu Quốc hội và đại biểu HĐND các cấp nhiệm kỳ 2026 - 2031 được ấn định vào Chủ nhật, ngày 10/03/2026.',
  },
  {
    question:
      'Công dân Việt Nam đủ bao nhiêu tuổi trở lên thì có quyền bỏ phiếu bầu cử?',
    options: [
      'Đủ 16 tuổi trở lên',
      'Đủ 18 tuổi trở lên',
      'Đủ 20 tuổi trở lên',
      'Đủ 21 tuổi trở lên',
    ],
    correctIndex: 1,
    explanation:
      'Tính đến ngày bầu cử được công bố, công dân Việt Nam đủ 18 tuổi trở lên có quyền bầu cử và đủ 21 tuổi trở lên có quyền ứng cử.',
  },
  {
    question:
      'Khi viết phiếu bầu, cử tri thực hiện như thế nào đối với người mà mình KHÔNG bầu?',
    options: [
      'Khoanh tròn vào tên người mình bầu',
      'Gạch ngang cả họ và tên người mà mình không bầu',
      'Đánh dấu X vào ô trống cạnh tên ứng cử viên',
      'Viết thêm tên người khác vào cuối phiếu bầu',
    ],
    correctIndex: 1,
    explanation:
      'Cử tri gạch ngang cả họ và tên những người mà mình không bầu; tuyệt đối không khoanh tròn và không viết thêm tên người ngoài danh sách vào phiếu.',
  },
  {
    question:
      'Nguyên tắc bầu cử đại biểu Quốc hội và đại biểu Hội đồng nhân dân ở nước ta gồm những nguyên tắc nào?',
    options: [
      'Phổ thông, bình đẳng, trực tiếp và bỏ phiếu kín',
      'Công khai, ủy quyền, bình đẳng và giơ tay biểu quyết',
      'Đại diện hộ gia đình đi bầu thay cho các thành viên',
      'Bỏ phiếu trực tuyến hoặc qua thư tín tự do',
    ],
    correctIndex: 0,
    explanation:
      'Điều 1 Luật Bầu cử quy định rõ 4 nguyên tắc: Phổ thông, bình đẳng, trực tiếp và bỏ phiếu kín.',
  },
];

let quizCursor = 0;

export function buildDeterministicQuiz(
  knowledgeBase?: KnowledgeItem[],
  seedIndex?: number
): QuizQuestion {
  if (typeof seedIndex === 'number') {
    return QUIZ_BANK[Math.abs(seedIndex) % QUIZ_BANK.length];
  }
  const chosen = QUIZ_BANK[quizCursor % QUIZ_BANK.length];
  quizCursor += 1;
  return chosen;
}

export function validateKnowledgeItem(input: {
  topic: string;
  content: string;
}): { valid: boolean; error?: string } {
  const topic = (input.topic || '').trim();
  const content = (input.content || '').trim();
  if (!topic) {
    return { valid: false, error: 'Vui lòng nhập tiêu đề chủ đề.' };
  }
  if (topic.length < 3) {
    return { valid: false, error: 'Tiêu đề chủ đề phải có ít nhất 3 ký tự.' };
  }
  if (!content) {
    return { valid: false, error: 'Vui lòng nhập nội dung chi tiết.' };
  }
  if (content.length < 5) {
    return { valid: false, error: 'Nội dung chi tiết phải có ít nhất 5 ký tự.' };
  }
  return { valid: true };
}

export function parseAdminCommandFallback(
  userQuery: string,
  currentKnowledge: KnowledgeItem[]
): AdminCommandResult {
  const trimmed = userQuery.trim();
  const norm = normalizeVietnamese(trimmed);

  // Check ADD pattern: e.g. "Thêm nội dung: Tiêu đề - Nội dung" or "Thêm: Tiêu đề | Nội dung" or "Thêm chủ đề ..."
  const addMatch = trimmed.match(
    /^(?:thêm|them)(?:\s+nội\s+dung|\s+noi\s+dung|\s+mục|\s+muc|\s+chủ\s+đề|\s+chu\s+de)?\s*[:\-]?\s*(.+?)\s*(?:[:\-|]|nội dung\s*[:\-])\s*(.+)$/i
  );
  if (addMatch) {
    const topic = addMatch[1].trim();
    const content = addMatch[2].trim();
    return {
      action: 'add',
      topic,
      content,
      reply: `✅ Đã phân tích lệnh thêm mới chủ đề "${topic}" vào CSDL.`,
    };
  }

  // Check DELETE pattern: e.g. "Xóa mục <topic>" or "Xóa <topic>"
  const deleteMatch = trimmed.match(
    /^(?:xóa|xoa|xoá)(?:\s+nội\s+dung|\s+mục|\s+muc|\s+chủ\s+đề)?\s*[:\-]?\s*(.+)$/i
  );
  if (deleteMatch) {
    const targetQuery = deleteMatch[1].trim();
    const found = searchKnowledgeBase(currentKnowledge, targetQuery);
    if (found.length > 0) {
      return {
        action: 'delete',
        targetId: found[0].id,
        topic: found[0].topic,
        reply: `🗑️ Đã xác định bản ghi "${found[0].topic}" để xóa khỏi CSDL.`,
      };
    }
    return {
      action: 'none',
      reply: `⚠️ Không tìm thấy bản ghi nào khớp với "${targetQuery}" trong CSDL để xóa.`,
    };
  }

  // Check UPDATE pattern: e.g. "Sửa <topic> thành <new content>"
  const updateMatch = trimmed.match(
    /^(?:sửa|sua|cập\s+nhật|cap\s+nhat)\s+(.+?)\s+(?:thành|thanh|là|la|:)\s*(.+)$/i
  );
  if (updateMatch) {
    const targetQuery = updateMatch[1].trim();
    const newContent = updateMatch[2].trim();
    const found = searchKnowledgeBase(currentKnowledge, targetQuery);
    if (found.length > 0) {
      return {
        action: 'update',
        targetId: found[0].id,
        topic: found[0].topic,
        content: newContent,
        reply: `✅ Đã xác định bản ghi "${found[0].topic}" để cập nhật nội dung mới.`,
      };
    }
    return {
      action: 'add',
      topic: targetQuery,
      content: newContent,
      reply: `ℹ️ Chưa có mục "${targetQuery}", hệ thống sẽ thêm mới mục này vào CSDL.`,
    };
  }

  if (norm.startsWith('them ')) {
    const body = trimmed.replace(/^(?:thêm|them)\s*/i, '');
    return {
      action: 'add',
      topic: body.slice(0, 40),
      content: body,
      reply: `✅ Đã thêm thông tin mới vào CSDL.`,
    };
  }

  return {
    action: 'none',
    reply: answerFromKnowledgeBaseFallback(userQuery, currentKnowledge),
  };
}

export function createElectionPosterSvgDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#dc2626" />
        <stop offset="55%" stop-color="#b91c1c" />
        <stop offset="100%" stop-color="#991b1b" />
      </linearGradient>
      <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.85" />
      </linearGradient>
      <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f1f5f9" />
      </linearGradient>
    </defs>

    <!-- Red Background -->
    <rect width="600" height="800" fill="url(#bgGrad)" />

    <!-- Sunburst rays -->
    <g opacity="0.16" fill="#fef08a">
      <polygon points="300,320 0,0 90,0" />
      <polygon points="300,320 180,0 270,0" />
      <polygon points="300,320 330,0 420,0" />
      <polygon points="300,320 510,0 600,0" />
      <polygon points="300,320 600,120 600,220" />
      <polygon points="300,320 0,120 0,220" />
      <polygon points="300,320 600,360 600,460" />
      <polygon points="300,320 0,360 0,460" />
    </g>

    <!-- Decorative gold frame -->
    <rect x="24" y="24" width="552" height="752" rx="20" fill="none" stroke="#fde047" stroke-width="4" opacity="0.85" />
    <rect x="34" y="34" width="532" height="732" rx="14" fill="none" stroke="#fde047" stroke-width="1.5" opacity="0.45" />

    <!-- Hoi An Festive Lanterns at Top Corners -->
    <g transform="translate(105, 40)">
      <line x1="0" y1="0" x2="0" y2="35" stroke="#fde047" stroke-width="3" />
      <ellipse cx="0" cy="58" rx="28" ry="22" fill="#f59e0b" stroke="#fde047" stroke-width="2.5" />
      <rect x="-10" y="33" width="20" height="6" rx="2" fill="#fde047" />
      <rect x="-10" y="78" width="20" height="6" rx="2" fill="#fde047" />
      <line x1="-4" y1="84" x2="-6" y2="104" stroke="#fde047" stroke-width="2" />
      <line x1="0" y1="84" x2="0" y2="108" stroke="#fde047" stroke-width="2" />
      <line x1="4" y1="84" x2="6" y2="104" stroke="#fde047" stroke-width="2" />
    </g>
    <g transform="translate(495, 40)">
      <line x1="0" y1="0" x2="0" y2="35" stroke="#fde047" stroke-width="3" />
      <ellipse cx="0" cy="58" rx="28" ry="22" fill="#f59e0b" stroke="#fde047" stroke-width="2.5" />
      <rect x="-10" y="33" width="20" height="6" rx="2" fill="#fde047" />
      <rect x="-10" y="78" width="20" height="6" rx="2" fill="#fde047" />
      <line x1="-4" y1="84" x2="-6" y2="104" stroke="#fde047" stroke-width="2" />
      <line x1="0" y1="84" x2="0" y2="108" stroke="#fde047" stroke-width="2" />
      <line x1="4" y1="84" x2="6" y2="104" stroke="#fde047" stroke-width="2" />
    </g>

    <!-- Golden Halo & National Star -->
    <circle cx="300" cy="215" r="135" fill="url(#sunGrad)" opacity="0.22" />
    <circle cx="300" cy="215" r="95" fill="url(#sunGrad)" opacity="0.32" />
    <polygon
      points="300,65 322,128 388,128 335,166 355,230 300,192 245,230 265,166 212,128 278,128"
      fill="#fde047"
    />

    <!-- Stylized Citizens on Left & Right -->
    <!-- Left Citizen (Ao Dai) -->
    <g transform="translate(95, 385)">
      <circle cx="45" cy="45" r="26" fill="#fde68a" />
      <path d="M18,40 Q45,10 72,40 Z" fill="#1e293b" />
      <path d="M12,95 Q45,75 78,95 L90,220 L5,220 Z" fill="#f59e0b" stroke="#fde047" stroke-width="2" />
      <path d="M65,105 L125,65" stroke="#fde68a" stroke-width="14" stroke-linecap="round" />
    </g>

    <!-- Right Citizen -->
    <g transform="translate(415, 385)">
      <circle cx="45" cy="45" r="26" fill="#fde68a" />
      <path d="M20,36 Q45,12 70,36 Z" fill="#1e293b" />
      <path d="M10,95 Q45,75 80,95 L88,220 L2,220 Z" fill="#2563eb" stroke="#93c5fd" stroke-width="2" />
      <path d="M25,105 L-35,65" stroke="#fde68a" stroke-width="14" stroke-linecap="round" />
    </g>

    <!-- Ballot Box Center -->
    <g transform="translate(170, 365)">
      <!-- Box Shadow -->
      <ellipse cx="130" cy="240" rx="150" ry="22" fill="#450a0a" opacity="0.45" />
      <!-- Box Body -->
      <rect x="20" y="45" width="220" height="185" rx="16" fill="url(#boxGrad)" stroke="#fde047" stroke-width="5" />
      <!-- Box Top Lid -->
      <rect x="8" y="25" width="244" height="32" rx="10" fill="#fde047" />
      <!-- Ballot Slot -->
      <rect x="85" y="36" width="90" height="8" rx="4" fill="#7f1d1d" />
      <!-- Red emblem on Ballot Box -->
      <circle cx="130" cy="140" r="46" fill="#dc2626" stroke="#fde047" stroke-width="3" />
      <polygon
        points="130,108 138,130 162,130 143,144 150,166 130,152 110,166 117,144 98,130 122,130"
        fill="#fde047"
      />
    </g>

    <!-- Ballot Paper Entering Slot -->
    <g transform="translate(260, 265) rotate(-8)">
      <rect x="0" y="0" width="88" height="118" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2.5" />
      <rect x="14" y="18" width="60" height="8" rx="4" fill="#dc2626" />
      <rect x="14" y="36" width="48" height="6" rx="3" fill="#94a3b8" />
      <rect x="14" y="50" width="54" height="6" rx="3" fill="#94a3b8" />
      <rect x="14" y="64" width="42" height="6" rx="3" fill="#94a3b8" />
      <circle cx="64" cy="90" r="11" fill="#16a34a" />
      <path d="M59 90 L63 94 L70 86" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" />
    </g>

    <!-- Stylized Lotus Petals at Bottom -->
    <g transform="translate(300, 635)" fill="#fca5a5" opacity="0.32">
      <ellipse cx="-120" cy="0" rx="55" ry="22" transform="rotate(-15 -120 0)" />
      <ellipse cx="120" cy="0" rx="55" ry="22" transform="rotate(15 120 0)" />
      <ellipse cx="-60" cy="10" rx="60" ry="24" transform="rotate(-8 -60 10)" />
      <ellipse cx="60" cy="10" rx="60" ry="24" transform="rotate(8 60 10)" />
      <ellipse cx="0" cy="14" rx="65" ry="25" />
    </g>

    <!-- Bottom Ribbon Emblem (ASCII/Numbers only for universal SVG font compatibility) -->
    <rect x="90" y="655" width="420" height="56" rx="28" fill="#fde047" />
    <text x="300" y="692" text-anchor="middle" fill="#991b1b" font-family="sans-serif" font-size="26" font-weight="800" letter-spacing="3">
      10 • 03 • 2026
    </text>
    <g transform="translate(300, 735)" fill="#fde047">
      <circle cx="-60" cy="0" r="4" />
      <polygon points="0,-9 3,-2 10,-2 4,2 6,9 0,5 -6,9 -4,2 -10,-2 -3,-2" />
      <circle cx="60" cy="0" r="4" />
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
