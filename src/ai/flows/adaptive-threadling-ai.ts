'use server';
/**
 * @fileOverview This file implements a Genkit flow for the Threadling enemy AI in "REDROOM: THE LAST EXIT".
 * It determines the Threadling's high-level actions and movement strategies based on game state and player-generated sounds,
 * informing the game engine's inverse kinematics and acoustic awareness systems.
 *
 * - adaptThreadlingAI - A function that triggers the AI decision-making process.
 * - ThreadlingAIInput - The input type for the adaptThreadlingAI function.
 * - ThreadlingAIOutput - The return type for the adaptThreadlingAI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CoordinatesSchema = z.object({
  x: z.number().describe('The X-coordinate.'),
  y: z.number().describe('The Y-coordinate.'),
  z: z.number().describe('The Z-coordinate.'),
});

const ThreadlingAIInputSchema = z.object({
  threadlingCurrentPosition: CoordinatesSchema.describe(
    'The current 3D position of the Threadling enemy.'
  ),
  threadlingCurrentOrientation: CoordinatesSchema.describe(
    'The current 3D orientation (e.g., Euler angles) of the Threadling enemy, defining its facing direction.'
  ),
  threadlingAwarenessLevel: z
    .enum(['unaware', 'alerted', 'pursuing', 'hunting'])
    .describe(
      "The Threadling's current awareness level: 'unaware', 'alerted' (heard something), 'pursuing' (saw player), or 'hunting' (stalking last known player location)."
    ),
  recentSoundEvent: z
    .object({
      type: z
        .enum(['footstep', 'loud_bang', 'rustle', 'door_creak', 'vocalization'])
        .describe('The type of sound detected.'),
      intensity: z
        .number()
        .min(0)
        .max(1)
        .describe('The intensity of the sound, from 0 (faint) to 1 (very loud).'),
      location: CoordinatesSchema.describe('The 3D location where the sound occurred.'),
    })
    .optional()
    .describe('Details of the most recent sound event, if any.'),
  playerLastKnownLocation: CoordinatesSchema.optional().describe(
    'The last known 3D position of the player, if observed recently.'
  ),
  hasLineOfSightToPlayer: z
    .boolean()
    .describe('True if the Threadling currently has a direct line of sight to the player.'),
});

export type ThreadlingAIInput = z.infer<typeof ThreadlingAIInputSchema>;

const ThreadlingAIOutputSchema = z.object({
  nextAction: z
    .enum(['pursuePlayer', 'investigateSound', 'patrol', 'hide', 'stalk'])
    .describe(
      "The high-level action the Threadling should take: 'pursuePlayer', 'investigateSound', 'patrol' an area, 'hide' from view, or 'stalk' the player's last known location."
    ),
  targetCoordinates: CoordinatesSchema.optional().describe(
    'The 3D coordinates for the Threadling to move towards, if applicable to the nextAction.'
  ),
  movementStyle: z
    .enum(['fastCrawl', 'stealthyCrawl', 'aggressiveCharge', 'stationary'])
    .describe(
      "The manner in which the Threadling should move: 'fastCrawl' (quick movement along surfaces), 'stealthyCrawl' (slow, quiet movement along surfaces), 'aggressiveCharge' (direct, fast movement ignoring stealth), or 'stationary' (no movement)."
    ),
  reactionIntensity: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'A value from 0 to 1 indicating the intensity of the Threadling\u2019s reaction or alertness, influencing animation speed or sound cues.'
    ),
  tacticalAdvice: z
    .string()
    .optional()
    .describe(
      'Optional tactical advice for the game engine to interpret for inverse kinematics or pathfinding, e.g., "utilize ceiling for surprise attack" or "remain low to the ground".'
    ),
});

export type ThreadlingAIOutput = z.infer<typeof ThreadlingAIOutputSchema>;

export async function adaptThreadlingAI(
  input: ThreadlingAIInput
): Promise<ThreadlingAIOutput> {
  return adaptiveThreadlingAIFlow(input);
}

const threadlingAIPrompt = ai.definePrompt({
  name: 'threadlingAIPrompt',
  input: {schema: ThreadlingAIInputSchema},
  output: {schema: ThreadlingAIOutputSchema},
  prompt: `You are the Threadling, a predatory, wall-crawling entity within the REDROOM. Your existence is driven by an instinct to hunt and terrorize. Your movement is fluid and unnerving, utilizing inverse kinematics to traverse any surface. Your senses are acutely tuned to sound.

Based on the current game state, you must decide your next high-level action, target, movement style, and reaction intensity. Provide optional tactical advice for your movement system.

Your current state:
- Position: {{{threadlingCurrentPosition.x}}}, {{{threadlingCurrentPosition.y}}}, {{{threadlingCurrentPosition.z}}}
- Orientation: {{{threadlingCurrentOrientation.x}}}, {{{threadlingCurrentOrientation.y}}}, {{{threadlingCurrentOrientation.z}}}
- Awareness Level: {{{threadlingAwarenessLevel}}}
- Has Line of Sight to Player: {{{hasLineOfSightToPlayer}}}

{{#if playerLastKnownLocation}}
- Last Known Player Location: {{{playerLastKnownLocation.x}}}, {{{playerLastKnownLocation.y}}}, {{{playerLastKnownLocation.z}}}
{{/if}}

{{#if recentSoundEvent}}
- Recent Sound Event:
  - Type: {{{recentSoundEvent.type}}}
  - Intensity: {{{recentSoundEvent.intensity}}}
  - Location: {{{recentSoundEvent.location.x}}}, {{{recentSoundEvent.location.y}}}, {{{recentSoundEvent.location.z}}}
{{else}}
- No recent sound events.
{{/if}}

Consider your awareness level, player line of sight, and any recent sounds. Prioritize terrifying the player and maintaining the hunt. If you have line of sight, pursue directly. If you hear a sound, investigate cautiously or aggressively based on intensity. If the player is lost, stalk their last known location or patrol.

Choose an action, target (if applicable), movement style, and reaction intensity. Provide specific tactical advice if it enhances your predatory behavior (e.g., use the ceiling, stay hidden, move silently).`,
});

const adaptiveThreadlingAIFlow = ai.defineFlow(
  {
    name: 'adaptiveThreadlingAIFlow',
    inputSchema: ThreadlingAIInputSchema,
    outputSchema: ThreadlingAIOutputSchema,
  },
  async (input) => {
    const {output} = await threadlingAIPrompt(input);
    return output!;
  }
);
