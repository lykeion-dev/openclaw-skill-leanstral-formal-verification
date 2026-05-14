		config: params.config,
		sessionAgentId
	});
	prepStages.mark("workspace-sandbox");
	let restoreSkillEnv;
	let aborted = Boolean(params.abortSignal?.aborted);
	let externalAbort = false;
	let timedOut = false;
	let idleTimedOut = false;
	let timedOutDuringCompaction = false;
	let timedOutDuringToolExecution = false;
	let promptError = null;
	let emitDiagnosticRunCompleted;
				}
			};
			const abortRun = (isTimeout = false, reason) => {
				aborted = true;
				if (isTimeout) {
					timedOut = true;
					if (!timedOutDuringCompaction && countActiveToolExecutions(params.runId) > 0) timedOutDuringToolExecution = true;
				}
				if (isTimeout) runAbortController.abort(reason ?? makeTimeoutAbortReason());
				else runAbortController.abort(reason);
				abortCompaction();
				abortActiveSession();
			};
			idleTimeoutTrigger = (error) => {
				idleTimedOut = true;
				abortRun(true, error);
			};
			const abortable$1 = (promise) => abortable(runAbortController.signal, promise);
			const promptActiveSession = (prompt, options) => abortable$1(trackPromptSettlePromise(activeSession.prompt(prompt, options)));
			const subscription = subscribeEmbeddedPiSession(buildEmbeddedSubscriptionParams({
				session: activeSession,
				runId: params.runId,
				initialReplayState: params.initialReplayState,
			let finalPromptText;
			if (params.replyOperation) params.replyOperation.attachBackend(queueHandle);
			setActiveEmbeddedRun(params.sessionId, queueHandle, params.sessionKey);
			let abortWarnTimer;
			const isProbeSession = params.sessionId?.startsWith("probe-") ?? false;
			const compactionTimeoutMs = resolveCompactionTimeoutMs(params.config);
			let abortTimer;
			let compactionGraceUsed = false;
			const scheduleAbortTimer = (delayMs, reason) => {
				abortTimer = setTimeout(() => {
					if (resolveRunTimeoutDuringCompaction({
						isCompactionPendingOrRetrying: subscription.isCompacting(),
						isCompactionInFlight: activeSession.isCompacting,
						graceAlreadyUsed: compactionGraceUsed
					}) === "extend") {
						compactionGraceUsed = true;
						if (!isProbeSession) log$4.warn(`embedded run timeout reached during compaction; extending deadline: runId=${params.runId} sessionId=${params.sessionId} extraMs=${compactionTimeoutMs}`);
						scheduleAbortTimer(compactionTimeoutMs, "compaction-grace");
						return;
					}
					if (!isProbeSession) log$4.warn(reason === "compaction-grace" ? `embedded run timeout after compaction grace: runId=${params.runId} sessionId=${params.sessionId} timeoutMs=${params.timeoutMs} compactionGraceMs=${compactionTimeoutMs}` : `embedded run timeout: runId=${params.runId} sessionId=${params.sessionId} timeoutMs=${params.timeoutMs}`);
					if (shouldFlagCompactionTimeout({
						isTimeout: true,
						isCompactionPendingOrRetrying: subscription.isCompacting(),
						isCompactionInFlight: activeSession.isCompacting
					})) timedOutDuringCompaction = true;
					abortRun(true);
					if (!abortWarnTimer) abortWarnTimer = setTimeout(() => {
						if (!activeSession.isStreaming) return;
						if (!isProbeSession) log$4.warn(`embedded run abort still streaming: runId=${params.runId} sessionId=${params.sessionId}`);
					}, 1e4);
				}, Math.max(1, delayMs));
			};
			scheduleAbortTimer(params.timeoutMs, "initial");
			let messagesSnapshot = [];
			let sessionIdUsed = activeSession.sessionId;
			let sessionFileUsed = params.sessionFile;
			const onAbort = () => {
				externalAbort = true;
				const reason = params.abortSignal ? getAbortReason(params.abortSignal) : void 0;
				const timeout = reason ? isTimeoutError(reason) : false;
				if (shouldFlagCompactionTimeout({
					isTimeout: timeout,
					isCompactionPendingOrRetrying: subscription.isCompacting(),
					isCompactionInFlight: activeSession.isCompacting
				})) timedOutDuringCompaction = true;
				abortRun(timeout, reason);
			};
			if (params.abortSignal) if (params.abortSignal.aborted) onAbort();
			else params.abortSignal.addEventListener("abort", onAbort, { once: true });
			const hookAgentId = sessionAgentId;
						currentAuthProfileIdSource: params.authProfileIdSource
					});
					if (requestedSelection && canRestartForLiveSwitch) {
						await clearLiveModelSwitchPending({
							cfg: params.config,
							sessionKey: resolvedSessionKey,
							agentId: params.agentId
						});
						log$1.info(`live session model switch requested during active attempt for ${params.sessionId}: ${provider}/${modelId} -> ${requestedSelection.provider}/${requestedSelection.model}`);
						throw new LiveSessionModelSwitchError(requestedSelection);
					}
					if (timedOut && !timedOutDuringCompaction && !timedOutDuringToolExecution) {
						const lastTurnPromptTokens = derivePromptTokens(lastRunPromptUsage);
						const tokenUsedRatio = lastTurnPromptTokens != null && ctxInfo.tokens > 0 ? lastTurnPromptTokens / ctxInfo.tokens : 0;
						if (timeoutCompactionAttempts >= MAX_TIMEOUT_COMPACTION_ATTEMPTS) log$1.warn(`[timeout-compaction] already attempted timeout compaction ${timeoutCompactionAttempts} time(s); falling through to failover rotation`);
						else if (tokenUsedRatio > .65) {
							const timeoutDiagId = createCompactionDiagId();
							timeoutCompactionAttempts++;
							log$1.warn(`[timeout-compaction] LLM timed out with high prompt token usage (${Math.round(tokenUsedRatio * 100)}%); attempting compaction before retry (attempt ${timeoutCompactionAttempts}/${MAX_TIMEOUT_COMPACTION_ATTEMPTS}) diagId=${timeoutDiagId}`);
							let timeoutCompactResult;
							await runOwnsCompactionBeforeHook("timeout recovery");
							try {
								const timeoutCompactionRuntimeContext = {
									...buildEmbeddedCompactionRuntimeContext({
										sessionKey: params.sessionKey,
										messageChannel: params.messageChannel,
										messageProvider: params.messageProvider,
										agentAccountId: params.agentAccountId,
										currentChannelId: params.currentChannelId,
										currentThreadTs: params.currentThreadTs,
										currentMessageId: params.currentMessageId,
										authProfileId: lastProfileId,
										workspaceDir: resolvedWorkspace,
										agentDir,
										config: params.config,
										skillsSnapshot: params.skillsSnapshot,
										senderIsOwner: params.senderIsOwner,
										senderId: params.senderId,
										provider,
										modelId,
										modelFallbacksOverride: params.modelFallbacksOverride,
										thinkLevel,
										reasoningLevel: params.reasoningLevel,
										bashElevated: params.bashElevated,
										extraSystemPrompt: params.extraSystemPrompt,
										sourceReplyDeliveryMode: params.sourceReplyDeliveryMode,
										ownerNumbers: params.ownerNumbers,
										activeProcessSessions: listActiveProcessSessionReferences({ scopeKey: resolveProcessToolScopeKey({
											sessionKey: params.sandboxSessionKey?.trim() || params.sessionKey,
											sessionId: activeSessionId,
											agentId: sessionAgentId
										}) })
									}),
									...resolveContextEngineCapabilities({
										config: params.config,
										sessionKey: params.sessionKey,
										agentId: sessionAgentId,
										contextEnginePluginId,
										purpose: "context-engine.timeout-compaction"
									}),
									onCompactionHookMessages,
									...attempt.promptCache ? { promptCache: attempt.promptCache } : {},
									runId: params.runId,
									trigger: "timeout_recovery",
									diagId: timeoutDiagId,
									attempt: timeoutCompactionAttempts,
									maxAttempts: MAX_TIMEOUT_COMPACTION_ATTEMPTS
								};
								timeoutCompactResult = await contextEngine.compact({
									sessionId: activeSessionId,
									sessionKey: params.sessionKey,
									sessionFile: activeSessionFile,
									tokenBudget: ctxInfo.tokens,
									force: true,
									compactionTarget: "budget",
									runtimeContext: timeoutCompactionRuntimeContext
								});
							} catch (compactErr) {
								log$1.warn(`[timeout-compaction] contextEngine.compact() threw during timeout recovery for ${provider}/${modelId}: ${String(compactErr)}`);
								timeoutCompactResult = {
									ok: false,
									compacted: false,
									reason: String(compactErr)
								};
							}
							if (timeoutCompactResult.compacted) adoptCompactionTranscript(timeoutCompactResult);
							await runOwnsCompactionAfterHook("timeout recovery", timeoutCompactResult);
							if (timeoutCompactResult.compacted) {
								autoCompactionCount += 1;
								if (typeof timeoutCompactResult.result?.tokensAfter === "number" && Number.isFinite(timeoutCompactResult.result.tokensAfter) && timeoutCompactResult.result.tokensAfter > 0) lastCompactionTokensAfter = Math.floor(timeoutCompactResult.result.tokensAfter);
								if (contextEngine.info.ownsCompaction === true) await runPostCompactionSideEffects({
									config: params.config,
									sessionKey: params.sessionKey,
									sessionFile: activeSessionFile
								});
								log$1.info(`[timeout-compaction] compaction succeeded for ${provider}/${modelId}; retrying prompt`);
								postCompactionGuard.armPostCompaction();
								continue;
							} else log$1.warn(`[timeout-compaction] compaction did not reduce context for ${provider}/${modelId}; falling through to normal handling`);
						}
					}
					const contextOverflowError = !aborted ? (() => {
						if (promptError) {
							const errorText = formatErrorMessage(promptError);
							if (isLikelyContextOverflowError(errorText)) return {
								text: errorText,
								source: "promptError"
							};
							return null;
						}
						if (assistantErrorText && isLikelyContextOverflowError(assistantErrorText)) return {
						inlineToolResultsAllowed: false,
						didSendViaMessagingTool: attempt.didSendViaMessagingTool,
						didSendDeterministicApprovalPrompt: attempt.didSendDeterministicApprovalPrompt,
						heartbeatToolResponse: attempt.heartbeatToolResponse
					});
					const payloadsWithToolMedia = mergeAttemptToolMediaPayloads({
						payloads,
						toolMediaUrls: attempt.toolMediaUrls,
						toolAudioAsVoice: attempt.toolAudioAsVoice
					});
					const timedOutDuringPrompt = timedOut && !timedOutDuringCompaction && !timedOutDuringToolExecution;
					const hasPartialAssistantTextAfterPromptTimeout = timedOutDuringPrompt && (attempt.assistantTexts ?? []).some((text) => text.trim().length > 0) && !attempt.clientToolCalls && !attempt.yieldDetected && !attempt.didSendViaMessagingTool && !attempt.didSendDeterministicApprovalPrompt && !attempt.lastToolError && (attempt.toolMetas?.length ?? 0) === 0;
					const attemptToolSummary = buildTraceToolSummary({
						toolMetas: attempt.toolMetas,
						hadFailure: Boolean(attempt.lastToolError)
					});
					const failureSignal = resolveEmbeddedRunFailureSignal({
						trigger: params.trigger,
						lastToolError: attempt.lastToolError
					});
					if (timedOutDuringPrompt && !hasMessagingToolDeliveryEvidence(attempt) && (!payloadsWithToolMedia?.length || hasPartialAssistantTextAfterPromptTimeout)) {
						const timeoutText = idleTimedOut ? "The model did not produce a response before the model idle timeout. Please try again, or increase `models.providers.<id>.timeoutSeconds` for slow local or self-hosted providers." : "Request timed out before a response was generated. Please try again, or increase `agents.defaults.timeoutSeconds` in your config.";
						const replayInvalid = resolveReplayInvalidForAttempt(null);
						const livenessState = resolveRunLivenessState({
							payloadCount: hasPartialAssistantTextAfterPromptTimeout ? 0 : payloads.length,
							aborted,
							timedOut,
							attempt,
							incompleteTurnText: null
						});
						attempt.setTerminalLifecycleMeta?.({
