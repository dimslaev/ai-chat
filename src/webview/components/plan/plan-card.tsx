import { CheckCircledIcon, CircleIcon } from "@radix-ui/react-icons";
import { Box, Button, Flex, Spinner, Text } from "@radix-ui/themes";
import * as React from "react";

import { Plan, PlanTask } from "@/lib/types";
import { postMessage } from "@/lib/utils";
import { useChatStore } from "@/store/chat";

const TaskStatusIcon: React.FC<{ status: PlanTask["status"] }> = ({
  status,
}) => {
  if (status === "completed") {
    return (
      <CheckCircledIcon fontSize={14} style={{ color: "var(--green-9)" }} />
    );
  }
  if (status === "in_progress") {
    return <Spinner size="1" />;
  }
  return <CircleIcon fontSize={14} style={{ color: "var(--gray-8)" }} />;
};

interface PlanCardProps {
  plan: Plan;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const vscode = useChatStore((state) => state.vscode);
  const setPlan = useChatStore((state) => state.setPlan);
  const isAwaitingApproval = plan.status === "awaiting_approval";

  const handleApprove = () => {
    if (vscode) {
      postMessage(vscode, "approvePlan");
    }
  };

  const handleReject = () => {
    if (vscode) {
      postMessage(vscode, "rejectPlan");
      setPlan(null);
    }
  };

  const completedCount = plan.tasks.filter(
    (t) => t.status === "completed",
  ).length;
  const totalCount = plan.tasks.length;

  return (
    <Box
      p="3"
      style={{
        background: "var(--gray-2)",
        borderRadius: "var(--radius-3)",
        border: "1px solid var(--gray-5)",
      }}
    >
      <Flex justify="between" align="center" mb="3">
        <Text size="2" weight="medium">
          Plan
        </Text>
        {!isAwaitingApproval && (
          <Text size="1" color="gray">
            {completedCount}/{totalCount} completed
          </Text>
        )}
      </Flex>

      <Flex direction="column" gap="2">
        {plan.tasks.map((task) => (
          <Flex key={task.id} gap="2">
            <Box flexShrink="0">
              <TaskStatusIcon status={task.status} />
            </Box>
            <Text
              size="2"
              style={{
                color:
                  task.status === "completed"
                    ? "var(--gray-9)"
                    : "var(--gray-12)",
                textDecoration:
                  task.status === "completed" ? "line-through" : "none",
              }}
            >
              {task.description}
            </Text>
          </Flex>
        ))}
      </Flex>

      {isAwaitingApproval && (
        <Flex gap="2" mt="3" justify="end">
          <Button size="1" variant="soft" color="gray" onClick={handleReject}>
            Reject
          </Button>
          <Button size="1" onClick={handleApprove}>
            Approve
          </Button>
        </Flex>
      )}
    </Box>
  );
};
