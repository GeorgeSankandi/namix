import { gql } from 'apollo-server-express';
// The 'const' is important here
export const typeDefs = gql`
type Product {
_id: ID!
productId: String!
title: String!
currentPrice: Float!
category: String!
image: String!
oldPrice: Float!
rating: Float
reviewCount: Int
thumbnails: [String]
features: [String]
}
type ChatResponse {
reply: String!
navigationTarget: String
highlightProductId: String
}
type Query {
products: [Product]
askChatbot(question: String!): ChatResponse
}
`;