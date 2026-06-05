'use server';
/**
 * @fileOverview A Genkit flow for dynamically generating and modulating horror soundscape parameters.
 *
 * - generateDynamicHorrorSoundscape - A function that calculates audio modulation parameters based on player state.
 * - DynamicHorrorSoundscapeInput - The input type for the generateDynamicHorrorSoundscape function.
 * - DynamicHorrorSoundscapeOutput - The return type for the generateDynamicHorrorSoundscape function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DynamicHorrorSoundscapeInputSchema = z.object({
  dangerProximity: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'A floating-point value from 0.0 (no immediate danger) to 1.0 (extreme, imminent danger).'
    ),
  psychologicalState: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'A floating-point value from 0.0 (calm and composed) to 1.0 (extreme panic and dread).'
    ),
});
export type DynamicHorrorSoundscapeInput = z.infer<
  typeof DynamicHorrorSoundscapeInputSchema
>;

const DynamicHorrorSoundscapeOutputSchema = z.object({
  breathingRateHz: z
    .number()
    .min(0.1)
    .max(3.0)
    .describe(
      'The frequency of the breathing sound in Hertz. Increases with danger and panic.'
    ),
  breathingVolume: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe(
      'The volume of the breathing sound, from 0.0 (silent) to 1.0 (max). Increases with danger and panic.'
    ),
  heartbeatRateBPM: z
    .number()
    .min(40)
    .max(200)
    .describe(
      'The rate of the heartbeat in beats per minute. Accelerates significantly with danger and panic.'
    ),
  heartbeatVolume: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe(
      'The volume of the heartbeat sound, from 0.0 (silent) to 1.0 (max). Increases with danger and panic.'
    ),
  droneFrequencyHz: z
    .number()
    .min(20)
    .max(500)
    .describe(
      'The base frequency of the unsettling ambient drone in Hertz. May shift lower or become more dissonant with increased danger.'
    ),
  droneVolume: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe(
      'The volume of the ambient drone, from 0.0 (silent) to 1.0 (max). Increases with danger and panic.'
    ),
  effectDescription: z
    .string()
    .describe('A brief textual description of the generated audio effect.'),
});
export type DynamicHorrorSoundscapeOutput = z.infer<
  typeof DynamicHorrorSoundscapeOutputSchema
>;

const prompt = ai.definePrompt({
  name: 'dynamicHorrorSoundscapePrompt',
  input: {schema: DynamicHorrorSoundscapeInputSchema},
  output: {schema: DynamicHorrorSoundscapeOutputSchema},
  prompt: `You are an expert audio engineer specializing in psychological horror game soundscapes. Your goal is to generate parameters for unsettling breathing drones and heartbeats based on the player's current state.

Player State:
- Danger Proximity: {{{dangerProximity}}} (0.0 = safe, 1.0 = extreme danger)
- Psychological State: {{{psychologicalState}}} (0.0 = calm, 1.0 = extreme panic)

Based on these inputs, modulate the following audio parameters to create a palpable sense of dread and panic:
- **Breathing**: As danger and panic increase, breathing should become faster (higher Hz) and louder. Very low danger should have slow, quiet breathing. Extreme panic should have rapid, gasping, loud breathing.
- **Heartbeat**: The heartbeat rate should directly reflect the player's fear, accelerating significantly with increasing danger and panic. Volume should also increase.
- **Drones**: The ambient drone should become more prominent and potentially shift to lower, more dissonant frequencies as danger and panic escalate, creating a pervasive sense of unease.

Ensure the values smoothly transition and reflect the described emotional and situational intensity. Provide a brief description of the overall effect.
`,
});

const dynamicHorrorSoundscapeFlow = ai.defineFlow(
  {
    name: 'dynamicHorrorSoundscapeFlow',
    inputSchema: DynamicHorrorSoundscapeInputSchema,
    outputSchema: DynamicHorrorSoundscapeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function generateDynamicHorrorSoundscape(
  input: DynamicHorrorSoundscapeInput
): Promise<DynamicHorrorSoundscapeOutput> {
  return dynamicHorrorSoundscapeFlow(input);
}
