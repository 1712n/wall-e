<div align="center">
  <img src="./misc/readme/wall-e.png" height="128px" width="128px" />
</div>

<div align="center">
  <h3>Wisdom Allocation Large Language Engine</h3>
</div>

<br/>

## What's WALL-e?

*WALL-e* is an advanced AI-driven system, primarily using GitHub as its knowledge base. It's designed to assist in various aspects of software development, from code analysis to project management.

## Architecture diagram

```mermaid
graph TB
  subgraph GitHubSources[GitHub]
    Issues(Issues)
    PullRequests(Pull Requests)
    Wikis(Wikis)
    Discussions(Discussions)
  end

  subgraph WisdomSources[Wisdom Sources]
    GitHubSources
  end

  subgraph EmbeddingModel[Embedding Model]
    Transform[[Transform]]
    Embed[[Transform]]
  end

  Transform --> Embed

  subgraph VectorStore[Vector Store]
    VectorStoreInsert[Insert]
    VectorStoreQuery[Query]
  end

  WisdomSources --> WebhookEvents[Webhook Events]
  WebhookEvents .->|Updates vector store whenever there's new content| EmbeddingModel
  Embeddings .-> VectorStoreInsert

  subgraph UserInterfaces[User Interfaces]
    direction TB
    Element
    GitHub
  end

  subgraph Agent
    Input[\Input/]
    PromptTemplate{{Prompt Template}}
    LLM(LLM)
    Actions[/Actions/]
  end

  subgraph Toolkits
    direction TB
    GitHubAction[GitHub]
    WebSearchAction[Web Search]
  end

  subgraph AgentExecutor[Agent Executor]
    Agent
    Toolkits
  end

  Embeddings[/Embeddings/]

  UserInterfaces -->|Users will send queries through the available UIs| Input
  Input --> EmbeddingModel
  Embeddings --> VectorStoreQuery
  Input -->|The input is also added to the prompt template| PromptTemplate
  EmbeddingModel --> Embeddings

  subgraph RetrievedDocuments[Retrieved Documents]
    Document1[/Document 1/]
    Document2[/Document 2/]
    DocumentN[/Document N/]
  end

  VectorStoreQuery --> RetrievedDocuments
  RetrievedDocuments --> PromptTemplate
  PromptTemplate --> LLM
  LLM --> Actions
  Actions -->|Executes actions via toolkits| Toolkits
```
