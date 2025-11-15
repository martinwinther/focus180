/**
 * Tests for Pomodoro segment generation algorithm.
 * Verifies balanced distribution of work minutes across segments.
 */

import { buildPomodoroSegmentsForDay, FocusSegment } from './ramp';

function formatSegments(segments: FocusSegment[]): string {
  return segments.map(s => `${s.minutes}`).join(' / ');
}

function getWorkMinutes(segments: FocusSegment[]): number[] {
  return segments.filter(s => s.type === 'work').map(s => s.minutes);
}

function getTotalWorkMinutes(segments: FocusSegment[]): number {
  return segments
    .filter(s => s.type === 'work')
    .reduce((sum, s) => sum + s.minutes, 0);
}

function assertMaxSegmentSize(segments: FocusSegment[], maxSize: number): void {
  const workSegments = segments.filter(s => s.type === 'work');
  const maxSegment = Math.max(...workSegments.map(s => s.minutes));
  if (maxSegment > maxSize) {
    throw new Error(
      `Expected all work segments ≤ ${maxSize} minutes, but found ${maxSegment}`
    );
  }
}

function assertSegmentsMatch(
  segments: FocusSegment[],
  expectedPattern: string,
  totalMinutes: number
): void {
  const actual = formatSegments(segments);
  const total = getTotalWorkMinutes(segments);
  
  if (actual !== expectedPattern) {
    throw new Error(
      `For ${totalMinutes} minutes:\n` +
      `  Expected: ${expectedPattern}\n` +
      `  Actual:   ${actual}`
    );
  }
  
  if (total !== totalMinutes) {
    throw new Error(
      `For ${totalMinutes} minutes:\n` +
      `  Expected total work: ${totalMinutes}\n` +
      `  Actual total work: ${total}`
    );
  }
  
  assertMaxSegmentSize(segments, 25);
}

// Test cases
function testShortDays(): void {
  console.log('Testing short days (< 20 minutes)...');
  
  // 10 minutes: single work segment, no breaks
  const segments10 = buildPomodoroSegmentsForDay(10);
  assertSegmentsMatch(segments10, '10', 10);
  
  // 19 minutes: single work segment, no breaks
  const segments19 = buildPomodoroSegmentsForDay(19);
  assertSegmentsMatch(segments19, '19', 19);
  
  console.log('✓ Short days passed');
}

function testTwoSegmentDays(): void {
  console.log('Testing two-segment days...');
  
  // 29 minutes: 15 / 5 / 14
  const segments29 = buildPomodoroSegmentsForDay(29);
  assertSegmentsMatch(segments29, '15 / 5 / 14', 29);
  
  // 32 minutes: 16 / 5 / 16
  const segments32 = buildPomodoroSegmentsForDay(32);
  assertSegmentsMatch(segments32, '16 / 5 / 16', 32);
  
  // 45 minutes: 23 / 5 / 22
  const segments45 = buildPomodoroSegmentsForDay(45);
  assertSegmentsMatch(segments45, '23 / 5 / 22', 45);
  
  console.log('✓ Two-segment days passed');
}

function testThreeSegmentDays(): void {
  console.log('Testing three-segment days...');
  
  // 52 minutes: 18 / 5 / 17 / 5 / 17
  const segments52 = buildPomodoroSegmentsForDay(52);
  assertSegmentsMatch(segments52, '18 / 5 / 17 / 5 / 17', 52);
  
  // 60 minutes: 20 / 5 / 20 / 5 / 20
  const segments60 = buildPomodoroSegmentsForDay(60);
  assertSegmentsMatch(segments60, '20 / 5 / 20 / 5 / 20', 60);
  
  console.log('✓ Three-segment days passed');
}

function testLargerDays(): void {
  console.log('Testing larger days...');
  
  // 76 minutes: 19 / 5 / 19 / 5 / 19 / 5 / 19
  const segments76 = buildPomodoroSegmentsForDay(76);
  assertSegmentsMatch(segments76, '19 / 5 / 19 / 5 / 19 / 5 / 19', 76);
  
  // 104 minutes: 21 / 5 / 21 / 5 / 21 / 5 / 21 / 5 / 20
  const segments104 = buildPomodoroSegmentsForDay(104);
  assertSegmentsMatch(segments104, '21 / 5 / 21 / 5 / 21 / 5 / 21 / 5 / 20', 104);
  
  console.log('✓ Larger days passed');
}

function testEdgeCases(): void {
  console.log('Testing edge cases...');
  
  // Exactly 20 minutes: should have breaks (threshold)
  const segments20 = buildPomodoroSegmentsForDay(20);
  const workMinutes20 = getWorkMinutes(segments20);
  if (workMinutes20.length !== 1 || workMinutes20[0] !== 20) {
    throw new Error(`Expected [20] for 20 minutes, got ${workMinutes20.join(', ')}`);
  }
  // Actually, 20 minutes should be 1 segment with no break (since it's < 20 is the condition)
  // Wait, the condition is < 20, so 20 should have breaks. Let me check the logic...
  // Actually, re-reading: "If totalMinutes < 20: no breaks"
  // So 20 >= 20, so it should have breaks. But 20/25 = 1 segment, so it's just [20] with no break needed.
  // That's correct - single segment of 20 minutes, no break needed.
  
  // 25 minutes: single segment
  const segments25 = buildPomodoroSegmentsForDay(25);
  assertSegmentsMatch(segments25, '25', 25);
  
  // 50 minutes: 25 / 5 / 25
  const segments50 = buildPomodoroSegmentsForDay(50);
  assertSegmentsMatch(segments50, '25 / 5 / 25', 50);
  
  // 100 minutes: should distribute evenly
  const segments100 = buildPomodoroSegmentsForDay(100);
  const total100 = getTotalWorkMinutes(segments100);
  if (total100 !== 100) {
    throw new Error(`Expected 100 work minutes, got ${total100}`);
  }
  assertMaxSegmentSize(segments100, 25);
  
  console.log('✓ Edge cases passed');
}

function runAllTests(): void {
  console.log('Running Pomodoro segment generation tests...\n');
  
  try {
    testShortDays();
    testTwoSegmentDays();
    testThreeSegmentDays();
    testLargerDays();
    testEdgeCases();
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };

