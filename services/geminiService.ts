import { GameReport } from '../types';

// Hardcoded library of teacher comments
const REPORT_COMMENTS = [
  "My cat flies better than this, and she's a tortoise.",
  "Did you learn aerodynamics from a brick?",
  "A for effort, F for flight.",
  "I've seen sandwiches glide further.",
  "Sir Isaac Newton is rolling in his grave.",
  "You have successfully discovered the ground.",
  "Next time, try using the air.",
  "Was that a nose dive or a tactical landing?",
  "Paper: 1, Pilot: 0.",
  "Did you forget to unfold the wings?",
  "That was... brief.",
  "Physics is cruel, isn't it?",
  "Maybe origami isn't your calling.",
  "I'm not mad, just disappointed.",
  "Have you considered a career in submarines?",
  "Gravity: The silent killer.",
  "That landing registered on the Richter scale.",
  "Less 'Top Gun', more 'Drop Scone'.",
  "The floor really needed a hug, didn't it?",
  "Majestic. Like a wounded duck.",
  "Your plane has the aerodynamics of a shoe.",
  "I've seen falling leaves with more purpose.",
  "Please apologize to the tree that made this paper.",
  "Calculated trajectory: straight down.",
  "Houston, we have a problem.",
  "Mission Failed Successfully.",
  "That was a tragic waste of wood pulp.",
  "Try folding it with your eyes open next time.",
  "Is there a magnet in the floor?",
  "You flew like a majestic stone.",
  "I'm giving you a C- for 'Crash'.",
  "The janitor is going to be upset.",
  "Impressive vertical velocity.",
  "Keep your day job.",
  "If falling was a sport, you'd be a champion.",
  "Horizontal movement is key, remember?",
  "Were you aiming for the trash can?",
  "A stunning display of gravitational pull.",
  "Almost made it past the desk.",
  "I expected nothing and I'm still let down.",
  "Your pilot license is revoked.",
  "Have you tried turning it off and on again?",
  "Error 404: Lift not found.",
  "That flight was shorter than my attention span.",
  "Call the tower, we have a literal crash landing.",
  "I've graded rocks that flew better.",
  "Did you put lead weights in the nose?",
  "Graceful as a refrigerator.",
  "You really stuck that landing... literally.",
  "See me after class. We need to talk about lift."
];

export const getTeacherReport = async (score: number, distance: number, causeOfDeath: string): Promise<GameReport> => {
  // Simulate "thinking" delay for effect
  await new Promise(resolve => setTimeout(resolve, 600));

  let grade = 'F';
  if (score > 50) grade = 'D-';
  if (score > 100) grade = 'D';
  if (score > 200) grade = 'C-';
  if (score > 350) grade = 'C';
  if (score > 500) grade = 'B-';
  if (score > 700) grade = 'B';
  if (score > 900) grade = 'A-';
  if (score > 1200) grade = 'A';
  if (score > 1500) grade = 'A+';

  // Select a random witty comment
  const randomIndex = Math.floor(Math.random() * REPORT_COMMENTS.length);
  const comment = REPORT_COMMENTS[randomIndex];

  // Occasionally append the cause of death context if it's funny
  let finalComment = comment;
  if (Math.random() > 0.7) {
    if (causeOfDeath.includes("pencil")) {
      finalComment = `${comment} Watch out for the pencils next time!`;
    } else if (causeOfDeath.includes("desk")) {
      finalComment = `${comment} The desk is not a landing strip.`;
    }
  }

  return {
    grade,
    comment: finalComment
  };
};