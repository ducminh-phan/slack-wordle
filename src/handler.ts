import axios from "axios";
import dayjs from "dayjs";

import type { Block, DictionaryAPIResponse, WordleSolution } from "./interface";

const get = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await axios.get<T>(url, {
      timeout: 3_000,
    });

    return response.data;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response) {
      console.log("Response data", e.response.data);
      console.log("Response status", e.response.status);
    } else {
      console.log(e);
    }
  }

  return null;
};

const getSolution = async (): Promise<WordleSolution | null> => {
  const now = dayjs();
  const yesterday = now.subtract(1, "day");
  const yesterdayAsString = yesterday.format("YYYY-MM-DD");

  return await get(
    `https://www.nytimes.com/svc/wordle/v2/${yesterdayAsString}.json`,
  );
};

export default async () => {
  const rawSolution = await getSolution();
  if (rawSolution === null) {
    return;
  }

  const { solution, days_since_launch: index } = rawSolution;

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

  const dictAPIResponse = await get<DictionaryAPIResponse[]>(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${solution.toLowerCase()}`,
  );
  const dictAPIData = dictAPIResponse?.[0];

  if (dictAPIData) {
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
  }

  await axios.post(process.env.SLACK_WEBHOOK_URL!, { blocks });
};
