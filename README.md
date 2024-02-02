<div align="center">
  <img src="./misc/readme/wall-e.png" height="128px" width="128px" />
</div>

<div align="center">
  <h3>Wisdom Allocation Large Language Engine</h3>
</div>

<br/>

## What's WALL-e?

*WALL-e* is an advanced AI-driven system, primarily using GitHub as its knowledge base. It's designed to assist in various aspects of software development, from code analysis to project management.

## Agent architecture

```mermaid
graph TD
  subgraph UserInterfaces[User interfaces]
    Matrix
  end

  subgraph WisdomSource[Wisdom source]
    SourceA[Source A]
  end

  Input --> ResourcePlanning
  Context --> ResourcePlanning

  ResourcePlanning -->|"Formulate request(s) that\nwill be sent to the API"| ResourceDiscovery
  ResourceDiscovery -->|Decide which resources are\nthe most relevant| ResourceAcquisition
  ResourceAcquisition -->|"Collect the full version of the relevant resources"| ResourceEvaluation
  ResourceEvaluation -->|Use input, context and resources\nto generate a response to the user query| Output

  subgraph Agent
    Input[\Input/]
    Context[\Context/]
    Output[/Output/]

    ResourcePlanning[Resource planning]
    ResourceDiscovery[Resource discovery]
    ResourceAcquisition[Resource acquisition]
    ResourceEvaluation[Resource evaluation]
  end

  UserInterfaces --> MessagesAPI[Messages API]
  MessagesAPI -->|Conversation participant sends a query to the agent as input| Input
  MessagesAPI -->|Chat history and participants\n list with with descriptions| Context

  SourceA --> SourceAPI[Source API]
  SourceAPI .->|Get partial resources| ResourceDiscovery
  SourceAPI .->|Get full resources| ResourceAcquisition

  Output -->|Reply to the user with the response.\nOther conversation participants can be mentioned for more complex logic| MessageReply[Message reply]
```
