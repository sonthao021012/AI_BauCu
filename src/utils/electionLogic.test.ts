import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_BOOK_DATA,
  searchKnowledgeBase,
  answerFromKnowledgeBaseFallback,
  parseAdminCommandFallback,
  validateKnowledgeItem,
  buildDeterministicQuiz,
  simplifyTextFallback,
} from './electionLogic.ts';

test('searchKnowledgeBase finds relevant election date item', () => {
  const results = searchKnowledgeBase(
    OFFICIAL_BOOK_DATA,
    'Lịch bầu cử Quốc hội diễn ra khi nào?'
  );
  assert.ok(results.length > 0);
  assert.equal(results[0].topic, 'Ngày bầu cử');
});

test('searchKnowledgeBase finds voting location in Hoi An Dong', () => {
  const results = searchKnowledgeBase(
    OFFICIAL_BOOK_DATA,
    'Tôi ở phường Hội An Đông thì bỏ phiếu ở đâu?'
  );
  assert.ok(results.length > 0);
  assert.ok(results[0].topic.includes('Địa điểm bỏ phiếu'));
});

test('answerFromKnowledgeBaseFallback returns friendly answer with topic', () => {
  const answer = answerFromKnowledgeBaseFallback(
    'Nguyên tắc bầu cử là gì?',
    OFFICIAL_BOOK_DATA
  );
  assert.ok(answer.includes('Nguyên tắc bầu cử'));
  assert.ok(answer.includes('phổ thông, bình đẳng, trực tiếp và bỏ phiếu kín'));
});

test('parseAdminCommandFallback parses add, update, and delete commands accurately', () => {
  const addCmd = parseAdminCommandFallback(
    'Thêm nội dung: Giờ mở cửa - Từ 7h sáng đến 19h tối',
    OFFICIAL_BOOK_DATA
  );
  assert.equal(addCmd.action, 'add');
  assert.equal(addCmd.topic, 'Giờ mở cửa');
  assert.equal(addCmd.content, 'Từ 7h sáng đến 19h tối');

  const updateCmd = parseAdminCommandFallback(
    'Sửa Ngày bầu cử thành Chủ nhật ngày 10/03/2026 từ 6h30 sáng',
    OFFICIAL_BOOK_DATA
  );
  assert.equal(updateCmd.action, 'update');
  assert.equal(updateCmd.targetId, 'official-3');
  assert.ok(updateCmd.content?.includes('6h30 sáng'));

  const deleteCmd = parseAdminCommandFallback(
    'Xóa mục Cách gạch phiếu bầu',
    OFFICIAL_BOOK_DATA
  );
  assert.equal(deleteCmd.action, 'delete');
  assert.equal(deleteCmd.targetId, 'official-4');
});

test('validateKnowledgeItem enforces non-empty topic and content', () => {
  assert.equal(validateKnowledgeItem({ topic: '', content: 'Valid content' }).valid, false);
  assert.equal(validateKnowledgeItem({ topic: 'Tiêu đề hợp lệ', content: '' }).valid, false);
  assert.equal(
    validateKnowledgeItem({
      topic: 'Thời gian niêm yết',
      content: 'Danh sách cử tri được niêm yết trước 40 ngày.',
    }).valid,
    true
  );
});

test('buildDeterministicQuiz and simplifyTextFallback return structured outputs', () => {
  const quiz = buildDeterministicQuiz(OFFICIAL_BOOK_DATA, 0);
  assert.equal(quiz.options.length, 4);
  assert.ok(quiz.correctIndex >= 0 && quiz.correctIndex < 4);
  assert.ok(quiz.explanation.length > 10);

  const simplified = simplifyTextFallback(OFFICIAL_BOOK_DATA[0].content);
  assert.ok(simplified.includes('18 tuổi'));
});
