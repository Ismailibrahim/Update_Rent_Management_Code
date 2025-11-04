<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function quotationStats(Request $request): JsonResponse
    {
        $dateFrom = $request->get('date_from', now()->subMonths(6)->format('Y-m-d'));
        $dateTo = $request->get('date_to', now()->format('Y-m-d'));

        $stats = [
            'total_quotations' => Quotation::whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'total_value' => Quotation::whereBetween('created_at', [$dateFrom, $dateTo])->sum('total_amount'),
            'accepted_quotations' => Quotation::where('status', 'accepted')
                                            ->whereBetween('created_at', [$dateFrom, $dateTo])
                                            ->count(),
            'accepted_value' => Quotation::where('status', 'accepted')
                                        ->whereBetween('created_at', [$dateFrom, $dateTo])
                                        ->sum('total_amount'),
            'pending_quotations' => Quotation::whereIn('status', ['draft', 'sent'])
                                            ->whereBetween('created_at', [$dateFrom, $dateTo])
                                            ->count(),
            'conversion_rate' => 0
        ];

        if ($stats['total_quotations'] > 0) {
            $stats['conversion_rate'] = round(($stats['accepted_quotations'] / $stats['total_quotations']) * 100, 2);
        }

        return response()->json($stats);
    }

    public function quotationsByStatus(): JsonResponse
    {
        $statusCounts = Quotation::select('status', DB::raw('count(*) as count'))
                                ->groupBy('status')
                                ->get()
                                ->keyBy('status');

        return response()->json($statusCounts);
    }

    public function topCustomers(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);

        $topCustomers = Customer::withCount('quotations')
                               ->withSum('quotations', 'total_amount')
                               ->orderBy('quotations_total_amount_sum', 'desc')
                               ->take($limit)
                               ->get();

        return response()->json($topCustomers);
    }
}