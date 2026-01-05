"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import { CheckIcon } from "lucide-react";
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import type { ChatModel } from "@/lib/ai/models";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { fetcher } from "@/lib/utils";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputProvider,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  usePromptInputController,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  ArrowUpIcon,
  GlobeIcon,
  ImageIcon,
  PaperclipIcon,
  StopIcon,
} from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { SuggestedActions } from "./suggested-actions";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import type { VisibilityType } from "./visibility-selector";

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  webSearchEnabled,
  setWebSearchEnabled,
  imageGenEnabled,
  setImageGenEnabled,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: Dispatch<SetStateAction<boolean>>;
  imageGenEnabled: boolean;
  setImageGenEnabled: Dispatch<SetStateAction<boolean>>;
}) {
  const { width } = useWindowSize();
  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
      if (status !== "ready") {
        toast.error("Please wait for the model to finish its response!");
        return;
      }

      window.history.pushState({}, "", `/chat/${chatId}`);

      // Combine AI SDK files with existing attachments
      const allFiles = [
        ...attachments.map((a) => ({
          url: a.url,
          filename: a.name,
          mediaType: a.contentType,
        })),
        ...message.files,
      ];

      // Convert blob URLs to server URLs if needed
      const uploadedFiles = await Promise.all(
        allFiles.map(async (file) => {
          // If it's a blob URL, upload to server
          if (file.url?.startsWith("blob:")) {
            try {
              const response = await fetch(file.url);
              const blob = await response.blob();
              const formData = new FormData();
              formData.append("file", blob, file.filename || "file");

              const uploadResponse = await fetch("/api/files/upload", {
                method: "POST",
                body: formData,
              });

              if (uploadResponse.ok) {
                const data = await uploadResponse.json();
                return {
                  type: "file" as const,
                  url: data.url,
                  name: data.pathname,
                  mediaType: data.contentType,
                };
              }
              const { error } = await uploadResponse.json();
              toast.error(error || "Failed to upload file");
              return null;
            } catch (error) {
              console.error("Error uploading file:", error);
              toast.error("Failed to upload file");
              return null;
            }
          }
          // Already a server URL, use as-is
          return {
            type: "file" as const,
            url: file.url || "",
            name: file.filename || "",
            mediaType: file.mediaType || "",
          };
        })
      );

      const validFiles = uploadedFiles.filter(
        (file): file is NonNullable<typeof file> => file !== null
      );

      sendMessage({
        role: "user",
        parts: [
          ...validFiles,
          {
            type: "text",
            text: message.text,
          },
        ],
      });

      setAttachments([]);
      setLocalStorageInput("");
      setInput("");

      if (width && width > 768) {
        // Focus will be handled by AI SDK components
      }
    },
    [
      status,
      chatId,
      sendMessage,
      attachments,
      setAttachments,
      setLocalStorageInput,
      setInput,
      width,
    ]
  );


  return (
    <PromptInputProvider initialInput={input}>
      <MultimodalInputInner
        chatId={chatId}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        messages={messages}
        setMessages={setMessages}
        sendMessage={sendMessage}
        className={className}
        selectedVisibilityType={selectedVisibilityType}
        selectedModelId={selectedModelId}
        onModelChange={onModelChange}
        webSearchEnabled={webSearchEnabled}
        setWebSearchEnabled={setWebSearchEnabled}
        imageGenEnabled={imageGenEnabled}
        setImageGenEnabled={setImageGenEnabled}
        uploadQueue={uploadQueue}
        setUploadQueue={setUploadQueue}
        localStorageInput={localStorageInput}
        setLocalStorageInput={setLocalStorageInput}
        handleSubmit={handleSubmit}
        width={width}
      />
    </PromptInputProvider>
  );
}

function MultimodalInputInner({
  chatId,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  webSearchEnabled,
  setWebSearchEnabled,
  imageGenEnabled,
  setImageGenEnabled,
  uploadQueue,
  setUploadQueue,
  localStorageInput,
  setLocalStorageInput,
  handleSubmit,
  width,
}: {
  chatId: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: Dispatch<SetStateAction<boolean>>;
  imageGenEnabled: boolean;
  setImageGenEnabled: Dispatch<SetStateAction<boolean>>;
  uploadQueue: string[];
  setUploadQueue: Dispatch<SetStateAction<string[]>>;
  localStorageInput: string;
  setLocalStorageInput: (value: string) => void;
  handleSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => Promise<void>;
  width: number | undefined;
}) {
  const controller = usePromptInputController();
  const promptAttachments = usePromptInputAttachments();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync provider state to external state (one-way sync from provider)
  useEffect(() => {
    setInput(controller.textInput.value);
  }, [controller.textInput.value, setInput]);

  // Sync localStorage
  useEffect(() => {
    setLocalStorageInput(controller.textInput.value);
  }, [controller.textInput.value, setLocalStorageInput]);

  // Auto-focus
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (!hasAutoFocused.current && width) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
        hasAutoFocused.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [width]);


  const isSubmitDisabled = !controller.textInput.value.trim() || uploadQueue.length > 0;

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 &&
        promptAttachments.files.length === 0 && (
          <SuggestedActions
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
            sendMessage={sendMessage}
          />
        )}

      <PromptInput
        className="rounded-xl border border-border bg-background shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
        onSubmit={handleSubmit}
      >
        <PromptInputBody>
          {/* Show existing attachments */}
          {attachments.length > 0 && (
            <div
              className="flex flex-row items-end gap-2 overflow-x-scroll p-3"
              data-testid="attachments-preview"
            >
              {attachments.map((attachment) => (
                <PreviewAttachment
                  attachment={attachment}
                  key={attachment.url}
                  onRemove={() => {
                    setAttachments((currentAttachments) =>
                      currentAttachments.filter((a) => a.url !== attachment.url)
                    );
                  }}
                />
              ))}
            </div>
          )}

          {/* Show upload queue */}
          {uploadQueue.length > 0 && (
            <div
              className="flex flex-row items-end gap-2 overflow-x-scroll p-3"
              data-testid="upload-queue"
            >
              {uploadQueue.map((filename) => (
                <PreviewAttachment
                  attachment={{
                    url: "",
                    name: filename,
                    contentType: "",
                  }}
                  isUploading={true}
                  key={filename}
                />
              ))}
            </div>
          )}

          {/* AI SDK attachments - shown inline */}
          <PromptInputAttachments>
            {(attachment) => (
              <PromptInputAttachment data={attachment} />
            )}
          </PromptInputAttachments>

          <PromptInputTextarea
            className="grow resize-none border-0 border-none bg-transparent p-2 text-base outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
            data-testid="multimodal-input"
            placeholder="Send a message..."
            ref={textareaRef}
          />
        </PromptInputBody>

        <PromptInputFooter className="border-t-0 p-0 shadow-none dark:border-transparent">
          <PromptInputTools className="gap-0 sm:gap-0.5">
            <AttachmentsButtonInner
              selectedModelId={selectedModelId}
              status={status}
            />
            <WebSearchButton
              enabled={webSearchEnabled}
              onToggle={setWebSearchEnabled}
              selectedModelId={selectedModelId}
              status={status}
            />
            <ImageGenButton
              enabled={imageGenEnabled}
              onToggle={setImageGenEnabled}
              selectedModelId={selectedModelId}
              status={status}
            />
            <ModelSelectorCompact
              onModelChange={onModelChange}
              selectedModelId={selectedModelId}
            />
          </PromptInputTools>

          {status === "submitted" ? (
            <StopButton setMessages={setMessages} stop={stop} />
          ) : (
            <PromptInputSubmit
              className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
              data-testid="send-button"
              disabled={isSubmitDisabled}
              status={status}
              size="icon-sm"
            >
              <ArrowUpIcon size={14} />
            </PromptInputSubmit>
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    if (prevProps.webSearchEnabled !== nextProps.webSearchEnabled) {
      return false;
    }
    if (prevProps.imageGenEnabled !== nextProps.imageGenEnabled) {
      return false;
    }

    return true;
  }
);

function PureAttachmentsButtonInner({
  status,
  selectedModelId,
}: {
  status: UseChatHelpers<ChatMessage>["status"];
  selectedModelId: string;
}) {
  const attachments = usePromptInputAttachments();
  const isReasoningModel =
    selectedModelId.includes("reasoning") || selectedModelId.includes("think");

  return (
    <Button
      className="aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
      data-testid="attachments-button"
      disabled={status !== "ready" || isReasoningModel}
      onClick={(event) => {
        event.preventDefault();
        attachments.openFileDialog();
      }}
      variant="ghost"
    >
      <PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
    </Button>
  );
}

const AttachmentsButtonInner = memo(PureAttachmentsButtonInner);

function PureWebSearchButton({
  enabled,
  onToggle,
  selectedModelId,
  status,
}: {
  enabled: boolean;
  onToggle: Dispatch<SetStateAction<boolean>>;
  selectedModelId: string;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  const { data: models } = useSWR<ChatModel[]>("/api/models", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const selectedModel = models?.find((m) => m.id === selectedModelId);
  const supportsWebSearch = selectedModel?.pricingWebSearch !== null;
  const isReasoningModel =
    selectedModelId.includes("reasoning") || selectedModelId.includes("think");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              "aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent",
              enabled && "bg-accent"
            )}
            data-testid="web-search-button"
            disabled={status !== "ready" || !supportsWebSearch || isReasoningModel}
            onClick={(event) => {
              event.preventDefault();
              onToggle((prev) => !prev);
            }}
            variant="ghost"
          >
            <GlobeIcon size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{supportsWebSearch ? "Web Search" : "Web Search not supported"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const WebSearchButton = memo(PureWebSearchButton);

function PureImageGenButton({
  enabled,
  onToggle,
  selectedModelId,
  status,
}: {
  enabled: boolean;
  onToggle: Dispatch<SetStateAction<boolean>>;
  selectedModelId: string;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  const { data: models } = useSWR<ChatModel[]>("/api/models", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const selectedModel = models?.find((m) => m.id === selectedModelId);
  const supportsImageGen = selectedModel?.pricingImageGen !== null;
  const isReasoningModel =
    selectedModelId.includes("reasoning") || selectedModelId.includes("think");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              "aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent",
              enabled && "bg-accent"
            )}
            data-testid="image-gen-button"
            disabled={status !== "ready" || !supportsImageGen || isReasoningModel}
            onClick={(event) => {
              event.preventDefault();
              onToggle((prev) => !prev);
            }}
            variant="ghost"
          >
            <ImageIcon size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {supportsImageGen ? "Image Generation" : "Image Generation not supported"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const ImageGenButton = memo(PureImageGenButton);

function PureModelSelectorCompact({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  // Global keyboard shortcut: CMD + SHIFT + 7 to open model selector
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === "7") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: models, isLoading } = useSWR<ChatModel[]>(
    "/api/models",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Group models by provider
  const modelsByProvider = models
    ? models.reduce(
        (acc, model) => {
          if (!acc[model.provider]) {
            acc[model.provider] = [];
          }
          acc[model.provider].push(model);
          return acc;
        },
        {} as Record<string, ChatModel[]>
      )
    : {};

  const selectedModel =
    models?.find((m) => m.id === selectedModelId) ??
    models?.find((m) => m.id === DEFAULT_CHAT_MODEL) ??
    models?.[0] ??
    null;

  const [provider] = selectedModel?.id.split("/") ?? [""];

  // Provider display names
  const providerNames: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google",
    xai: "xAI",
    reasoning: "Reasoning",
  };

  if (isLoading || !models || models.length === 0) {
    return (
      <Button
        className="h-8 w-[200px] justify-between px-2"
        disabled
        variant="ghost"
      >
        <ModelSelectorName>
          {isLoading ? "Loading models..." : "No models available"}
        </ModelSelectorName>
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <ModelSelector onOpenChange={setOpen} open={open}>
        <ModelSelectorTrigger asChild>
          <Button className="h-8 w-[200px] justify-between px-2" variant="ghost">
            {provider && <ModelSelectorLogo provider={provider} />}
            <ModelSelectorName>{selectedModel?.name ?? "Select model"}</ModelSelectorName>
          </Button>
        </ModelSelectorTrigger>
        <ModelSelectorContent>
          <ModelSelectorInput placeholder="Search models..." />
          <ModelSelectorList>
          {Object.entries(modelsByProvider).map(
            ([providerKey, providerModels]) => (
              <ModelSelectorGroup
                heading={providerNames[providerKey] ?? providerKey}
                key={providerKey}
              >
                {providerModels.map((model) => {
                  const logoProvider = model.id.split("/")[0];
                  return (
                    <ModelSelectorItem
                      key={model.id}
                      onSelect={() => {
                        onModelChange?.(model.id);
                        setCookie("chat-model", model.id);
                        setOpen(false);
                      }}
                      value={model.id}
                    >
                      <ModelSelectorLogo provider={logoProvider} />
                      <div className="flex flex-col flex-1">
                        <ModelSelectorName>{model.name}</ModelSelectorName>
                        {model.pricingInput !== null &&
                          model.pricingOutput !== null && (
                            <span className="text-xs text-muted-foreground">
                              ${(model.pricingInput * 1_000_000).toFixed(2)}/$1M in • $
                              {(model.pricingOutput * 1_000_000).toFixed(2)}/$1M out
                            </span>
                          )}
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        {model.pricingImageGen !== null ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center text-muted-foreground">
                                <ImageIcon size={12} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Image Generation</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="size-3" />
                        )}
                        {model.pricingWebSearch !== null ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center text-muted-foreground">
                                <GlobeIcon size={12} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Web Search</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="size-3" />
                        )}
                        {model.id === selectedModel?.id ? (
                          <CheckIcon className="ml-1 size-4" />
                        ) : (
                          <div className="ml-1 size-4" />
                        )}
                      </div>
                    </ModelSelectorItem>
                  );
                })}
              </ModelSelectorGroup>
            )
          )}
        </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>
    </TooltipProvider>
  );
}

const ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <Button
      className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);
