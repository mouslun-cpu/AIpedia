import { Routes, Route, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { HowMachinesLearn } from './modules/how-machines-learn'
import { FeaturesLabels } from './modules/features-labels'
import { TrainValTest } from './modules/train-val-test'
import { LinearRegression } from './modules/linear-regression'
import { LossFunction } from './modules/loss-function'
import { GradientDescent } from './modules/gradient-descent'
import { PolynomialRegression } from './modules/polynomial-regression'
import { LogisticRegression } from './modules/logistic-regression'
import { KNN } from './modules/knn'
import { DecisionTree } from './modules/decision-tree'
import { NaiveBayes } from './modules/naive-bayes'
import { Overfitting } from './modules/overfitting'
import { BiasVariance } from './modules/bias-variance'
import { CrossValidation } from './modules/cross-validation'
import { Regularization } from './modules/regularization'
import { Metrics } from './modules/metrics'
import { RocAuc } from './modules/roc-auc'
import { KMeans } from './modules/kmeans'
import { Hierarchical } from './modules/hierarchical'
import { PCA } from './modules/pca'
import { RandomForest } from './modules/random-forest'
import { BaggingBoosting } from './modules/bagging-boosting'
import { Perceptron } from './modules/perceptron'
import { ForwardPass } from './modules/forward-pass'
import { ActivationFunctions } from './modules/activation-functions'
import { Backpropagation } from './modules/backpropagation'
import { CNN } from './modules/cnn'
import { RNN } from './modules/rnn'
import { LSTM } from './modules/lstm'
import { ReinforcementBasics } from './modules/reinforcement-basics'
import { QLearning } from './modules/q-learning'
import { GenerativeVsDiscriminative } from './modules/generative-vs-discriminative'
import { Tokenization } from './modules/tokenization'
import { Embeddings } from './modules/embeddings'
import { Attention } from './modules/attention'
import { Transformer } from './modules/transformer'
import { PromptEngineering } from './modules/prompt-engineering'
import { ContextEngineering } from './modules/context-engineering'
import { ToolUse } from './modules/tool-use'
import { AiAgent } from './modules/ai-agent'
import { Sampling } from './modules/sampling'
import { Diffusion } from './modules/diffusion'
import { GAN } from './modules/gan'
import { RAG } from './modules/rag'
import { Hallucination } from './modules/hallucination'
import { SVM } from './modules/svm'
import { SVMStock } from './modules/svm-stock'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/topic/how-machines-learn" element={<HowMachinesLearn />} />
      <Route path="/topic/features-labels" element={<FeaturesLabels />} />
      <Route path="/topic/train-val-test" element={<TrainValTest />} />
      <Route path="/topic/linear-regression" element={<LinearRegression />} />
      <Route path="/topic/loss-function" element={<LossFunction />} />
      <Route path="/topic/gradient-descent" element={<GradientDescent />} />
      <Route
        path="/topic/polynomial-regression"
        element={<PolynomialRegression />}
      />
      <Route
        path="/topic/logistic-regression"
        element={<LogisticRegression />}
      />
      <Route path="/topic/knn" element={<KNN />} />
      <Route path="/topic/decision-tree" element={<DecisionTree />} />
      <Route path="/topic/naive-bayes" element={<NaiveBayes />} />
      <Route path="/topic/overfitting" element={<Overfitting />} />
      <Route path="/topic/bias-variance" element={<BiasVariance />} />
      <Route path="/topic/cross-validation" element={<CrossValidation />} />
      <Route path="/topic/regularization" element={<Regularization />} />
      <Route path="/topic/metrics" element={<Metrics />} />
      <Route path="/topic/roc-auc" element={<RocAuc />} />
      <Route path="/topic/kmeans" element={<KMeans />} />
      <Route path="/topic/hierarchical" element={<Hierarchical />} />
      <Route path="/topic/pca" element={<PCA />} />
      <Route path="/topic/random-forest" element={<RandomForest />} />
      <Route path="/topic/bagging-boosting" element={<BaggingBoosting />} />
      <Route path="/topic/perceptron" element={<Perceptron />} />
      <Route path="/topic/forward-pass" element={<ForwardPass />} />
      <Route
        path="/topic/activation-functions"
        element={<ActivationFunctions />}
      />
      <Route path="/topic/backpropagation" element={<Backpropagation />} />
      <Route path="/topic/cnn" element={<CNN />} />
      <Route path="/topic/rnn" element={<RNN />} />
      <Route path="/topic/lstm" element={<LSTM />} />
      <Route
        path="/topic/reinforcement-basics"
        element={<ReinforcementBasics />}
      />
      <Route path="/topic/q-learning" element={<QLearning />} />
      <Route
        path="/topic/generative-vs-discriminative"
        element={<GenerativeVsDiscriminative />}
      />
      <Route path="/topic/tokenization" element={<Tokenization />} />
      <Route path="/topic/embeddings" element={<Embeddings />} />
      <Route path="/topic/attention" element={<Attention />} />
      <Route path="/topic/transformer" element={<Transformer />} />
      <Route path="/topic/prompt-engineering" element={<PromptEngineering />} />
      <Route path="/topic/context-engineering" element={<ContextEngineering />} />
      <Route path="/topic/tool-use" element={<ToolUse />} />
      <Route path="/topic/ai-agent" element={<AiAgent />} />
      <Route path="/topic/sampling" element={<Sampling />} />
      <Route path="/topic/diffusion" element={<Diffusion />} />
      <Route path="/topic/gan" element={<GAN />} />
      <Route path="/topic/rag" element={<RAG />} />
      <Route path="/topic/hallucination" element={<Hallucination />} />
      <Route path="/topic/svm" element={<SVM />} />
      <Route path="/topic/svm-stock" element={<SVMStock />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
