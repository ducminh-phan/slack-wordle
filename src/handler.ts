import axios from "axios";

import type { Block, DictionaryAPIResponse } from "./interface";
import words from "./words";

const ORIGIN_DATE = new Date(2021, 5, 19, 0, 0, 0, 0);

const getDateIndex = (date: Date): number => {
  const timeDelta =
    new Date(date).setHours(0, 0, 0, 0) - ORIGIN_DATE.setHours(0, 0, 0, 0);

  return Math.round(timeDelta / 864e5);
};

export default async () => {
  const today = new Date();

  const index = getDateIndex(today) - 1;
  const solution = words[index % words.length];

  const blocks: Block[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Wordle ${index}'s Answer: *${solution.toUpperCase()}*`,
      },
    },
    {
      type: "divider",
    },
  ];

  try {
    const dictAPIResponse = await axios.get<DictionaryAPIResponse[]>(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${solution.toLowerCase()}`,
    );
    const dictAPIData = dictAPIResponse.data?.[0];

    if (dictAPIData?.phonetics?.length ?? 0 >= 0) {
      for (const phonetic of dictAPIData.phonetics) {
        if (phonetic?.text !== undefined) {
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Phonetic: \`${phonetic.text}\``,
            },
          });
          break;
        }
      }
    }

    if (dictAPIData?.meanings?.length ?? 0 >= 0) {
      let text = "Meanings";
      for (const meaning of dictAPIData.meanings.slice(0, 3)) {
        text += `\n\t• ${meaning.partOfSpeech}`;
        for (const definition of meaning.definitions.slice(0, 3)) {
          text += `\n\t\t- ${definition.definition}`;
        }
      }

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text,
        },
      });
    }
  } catch (e) {
    if (axios.isAxiosError(e) && e.response) {
      console.log("Response data", e.response.data);
      console.log("Response status", e.response.status);
    } else {
      console.log(e);
    }
  }

  await axios.post(process.env.SLACK_WEBHOOK_URL!, { blocks });
};
