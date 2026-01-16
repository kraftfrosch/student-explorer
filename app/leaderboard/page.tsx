"use client";

import { useEffect, useState } from "react";
import { useSetType } from "@/components/set-type-provider";
import { AppHeader } from "@/components/app-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingDown, TrendingUp, Layers } from "lucide-react";
import type {
  LeaderboardEntry,
  CombinedLeaderboardEntry,
  LeaderboardResponse,
  CombinedLeaderboardResponse,
} from "@/lib/types";

type LeaderboardType = "inference" | "tutoring" | "combined";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
        🥇 1st
      </Badge>
    );
  }
  if (rank === 2) {
    return (
      <Badge className="bg-slate-400 hover:bg-slate-500 text-white font-bold">
        🥈 2nd
      </Badge>
    );
  }
  if (rank === 3) {
    return (
      <Badge className="bg-amber-700 hover:bg-amber-800 text-white font-bold">
        🥉 3rd
      </Badge>
    );
  }
  return <Badge variant="outline">{rank}</Badge>;
}

function LeaderboardTable({
  entries,
  type,
}: {
  entries: LeaderboardEntry[] | CombinedLeaderboardEntry[];
  type: LeaderboardType;
}) {
  const isCombined = type === "combined";
  const combinedEntries = entries as CombinedLeaderboardEntry[];

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b-2 border-muted">
          <TableHead className="w-20">Rank</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Score</TableHead>
          {isCombined && (
            <>
              <TableHead className="text-center">Inference Rank</TableHead>
              <TableHead className="text-center">Tutoring Rank</TableHead>
            </>
          )}
          <TableHead className="text-center">Submissions</TableHead>
          <TableHead className="text-right">Last Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry, index) => (
          <TableRow
            key={entry.team_id}
            className={index < 3 ? "bg-muted/30" : ""}
          >
            <TableCell>
              <RankBadge rank={index + 1} />
            </TableCell>
            <TableCell className="font-medium">{entry.team_name}</TableCell>
            <TableCell className="text-right font-mono">
              {entry.score.toFixed(4)}
            </TableCell>
            {isCombined && (
              <>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    #{combinedEntries[index].inference_rank}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    #{combinedEntries[index].tutoring_rank}
                  </Badge>
                </TableCell>
              </>
            )}
            <TableCell className="text-center">
              <Badge variant="outline">{entry.submission_count}</Badge>
            </TableCell>
            <TableCell className="text-right text-muted-foreground text-sm">
              {formatDate(entry.last_updated)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const { setType } = useSetType();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("combined");
  const [data, setData] = useState<
    LeaderboardResponse | CombinedLeaderboardResponse | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/leaderboard?type=${activeTab}&set_type=${setType}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [activeTab, setType]);

  const getTabIcon = (tab: LeaderboardType) => {
    switch (tab) {
      case "inference":
        return <TrendingDown className="h-4 w-4" />;
      case "tutoring":
        return <TrendingUp className="h-4 w-4" />;
      case "combined":
        return <Layers className="h-4 w-4" />;
    }
  };

  const getDescription = (tab: LeaderboardType) => {
    switch (tab) {
      case "inference":
        return "Ranked by lowest MSE score (lower is better)";
      case "tutoring":
        return "Ranked by highest average tutoring score (higher is better)";
      case "combined":
        return "Ranked by average of inference and tutoring ranks (lower is better)";
    }
  };

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Leaderboard" />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground">
              Agent Olympics 2026 competition rankings
            </p>
          </div>
        </div>

      <Card>
        <CardHeader className="pb-3">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as LeaderboardType)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="combined" className="flex items-center gap-2">
                {getTabIcon("combined")}
                Combined
              </TabsTrigger>
              <TabsTrigger value="inference" className="flex items-center gap-2">
                {getTabIcon("inference")}
                Inference
              </TabsTrigger>
              <TabsTrigger value="tutoring" className="flex items-center gap-2">
                {getTabIcon("tutoring")}
                Tutoring
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <CardDescription className="pt-2">
            {getDescription(activeTab)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : data && data.entries.length > 0 ? (
            <>
              <LeaderboardTable entries={data.entries} type={activeTab} />
              <p className="mt-4 text-sm text-muted-foreground text-right">
                Last updated: {formatDate(data.updated_at)}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mb-4 opacity-50" />
              <p>No leaderboard entries yet</p>
              <p className="text-sm">Be the first to submit!</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
