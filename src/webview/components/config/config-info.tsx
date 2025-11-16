import * as React from "react";
import { Flex, Text } from "@radix-ui/themes";
import { Configuration } from "@/lib/types";

interface ConfigInfoProps {
  config: Configuration | undefined;
}

export const ConfigInfo: React.FC<ConfigInfoProps> = ({ config }) => {
  if (!config) return null;

  return (
    <Flex
      direction="row"
      align="center"
      style={{ color: "var(--gray-10)" }}
      gap="1"
    >
      {config.model && (
        <Text size="1" className="config-name">
          {config.model}
        </Text>
      )}
      {config.maxCompletionTokens && (
        <>
          <Text size="2">·</Text>
          <Text size="1">Max: {config.maxCompletionTokens}</Text>
        </>
      )}
      {config.temperature && (
        <>
          <Text size="2">·</Text>
          <Text size="1">Temp: {config.temperature}</Text>
        </>
      )}
    </Flex>
  );
};
