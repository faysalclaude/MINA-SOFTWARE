export const SUBJECT_META = {
  korean: { color: 'var(--subject-korean)', icon: '📖' },
  integrated_curriculum: {
    color: 'var(--subject-integrated_curriculum)',
    icon: '🌱'
  },
  math: { color: 'var(--subject-math)', icon: '📐' },
  english: { color: 'var(--subject-english)', icon: '🔤' },
  science: { color: 'var(--subject-science)', icon: '🔬' },
  social_studies: { color: 'var(--subject-social_studies)', icon: '🌍' },
  moral_education: { color: 'var(--subject-moral_education)', icon: '💭' },
  practical_arts: { color: 'var(--subject-practical_arts)', icon: '🛠️' },
  computing: { color: 'var(--subject-computing)', icon: '💻' }
}

export function subjectColor (subject) {
  return SUBJECT_META[subject]?.color || 'var(--accent)'
}

export function subjectIcon (subject) {
  return SUBJECT_META[subject]?.icon || '📚'
}
