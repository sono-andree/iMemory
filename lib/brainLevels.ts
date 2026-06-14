export function getBrainLevel(score: number) {
  if (score >= 10000) {
    return {
      level: 10,
      title: "Digital Mastermind",
      currentMin: 10000,
      nextMin: 10000,
    };
  }

  if (score >= 7500) {
    return {
      level: 9,
      title: "Strategic Operator",
      currentMin: 7500,
      nextMin: 10000,
    };
  }

  if (score >= 5000) {
    return {
      level: 8,
      title: "Memory Architect",
      currentMin: 5000,
      nextMin: 7500,
    };
  }

  if (score >= 3000) {
    return {
      level: 7,
      title: "Deep Thinker",
      currentMin: 3000,
      nextMin: 5000,
    };
  }

  if (score >= 1800) {
    return {
      level: 6,
      title: "Focus Builder",
      currentMin: 1800,
      nextMin: 3000,
    };
  }

  if (score >= 1000) {
    return {
      level: 5,
      title: "Goal Hacker",
      currentMin: 1000,
      nextMin: 1800,
    };
  }

  if (score >= 500) {
    return {
      level: 4,
      title: "Memory Collector",
      currentMin: 500,
      nextMin: 1000,
    };
  }

  if (score >= 250) {
    return {
      level: 3,
      title: "Daily Learner",
      currentMin: 250,
      nextMin: 500,
    };
  }

  if (score >= 100) {
    return {
      level: 2,
      title: "Brain Starter",
      currentMin: 100,
      nextMin: 250,
    };
  }

  return {
    level: 1,
    title: "New Mind",
    currentMin: 0,
    nextMin: 100,
  };
}

export function getLevelProgress(score: number) {
  const brainLevel = getBrainLevel(score);

  if (brainLevel.nextMin === brainLevel.currentMin) {
    return 100;
  }

  return Math.min(
    Math.round(
      ((score - brainLevel.currentMin) /
        (brainLevel.nextMin - brainLevel.currentMin)) *
        100
    ),
    100
  );
}