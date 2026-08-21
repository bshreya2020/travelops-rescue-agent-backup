'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Bot,
    BrainCircuit,
    BusFront,
    CheckCircle2,
    GitFork,
    Plane,
    Radar,
    Route,
    ShieldCheck,
    Sparkles,
    TrainFront,
    TriangleAlert,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const rise = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0 },
};

const capabilities = [
    {
        icon: Plane,
        title: 'Live flight alternatives',
        detail: 'Direct and connecting flight recovery options',
        color: 'text-cyan-200',
    },
    {
        icon: TrainFront,
        title: 'Rail routes by city',
        detail: 'Station-aware train recovery between cities',
        color: 'text-violet-200',
    },
    {
        icon: BusFront,
        title: 'Bus backup routes',
        detail: 'Alternative bus options when other plans fail',
        color: 'text-orange-200',
    },
];

const rescueSteps = [
    {
        icon: TriangleAlert,
        title: '1. Understand',
        text: 'Captures the disruption, budget, deadline, passengers, and priorities.',
    },
    {
        icon: Radar,
        title: '2. Search',
        text: 'Searches flights, trains, and bus alternatives between locations.',
    },
    {
        icon: Route,
        title: '3. Compare',
        text: 'Measures complete journey time, cost, connections, and recovery risk.',
    },
    {
        icon: GitFork,
        title: '4. Replan',
        text: 'Ranks the best recovery plan before your deadline is lost.',
    },
];

const team = [
    {
        name: 'Shaista Meher',
        initials: 'SM',
        accent: 'from-cyan-400 to-blue-500',
    },
    {
        name: 'Shreya Bhatta',
        initials: 'SB',
        accent: 'from-violet-400 to-fuchsia-500',
    },
    {
        name: 'Archit Bhattacharya',
        initials: 'AB',
        accent: 'from-orange-400 to-rose-500',
    },
];

export function LandingPage() {
    return (
        <div className="landing-shell -mx-4 -mt-20 min-h-screen overflow-hidden px-4 pb-16 pt-28 text-slate-100">
            <div className="landing-grid-shine" />
            <div className="landing-orb landing-orb-one" />
            <div className="landing-orb landing-orb-two" />
            <div className="landing-orb landing-orb-three" />

            <section className="relative mx-auto grid max-w-6xl items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
                <motion.div
                    initial="hidden"
                    animate="show"
                    transition={{ staggerChildren: 0.11 }}
                >
                    <motion.div
                        variants={rise}
                        className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold tracking-[.16em] text-cyan-200"
                    >
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        MULTIMODAL TRAVEL CRISIS INTELLIGENCE
                    </motion.div>

                    <motion.h1
                        variants={rise}
                        className="max-w-3xl text-5xl font-black leading-[.95] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl"
                    >
                        When a trip breaks,
                        <br />
                        <span className="landing-gradient-text">
                            your plan fights back.
                        </span>
                    </motion.h1>

                    <motion.p
                        variants={rise}
                        className="mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg"
                    >
                        TravelOps is an autonomous rescue agent for cancelled flights,
                        delayed trains, missed connections, and impossible deadlines. It
                        searches flights, rail, and buses to find the best way forward.
                    </motion.p>

                    <motion.div
                        variants={rise}
                        className="mt-8 flex flex-col gap-3 sm:flex-row"
                    >
                        <Link className="landing-action" href="/crisis/new">
                            <Button
                                size="lg"
                                variant="primary"
                                icon={<TriangleAlert size={18} />}
                            >
                                Rescue my trip
                            </Button>
                        </Link>

                        <a className="landing-action" href="#how-it-works">
                            <Button
                                size="lg"
                                variant="secondary"
                                icon={<ArrowRight size={18} />}
                            >
                                See the agent think
                            </Button>
                        </a>
                    </motion.div>

                    <motion.div
                        variants={rise}
                        className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300"
                    >
                        <span className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-emerald-400" />
                            You approve every booking
                        </span>

                        <span className="flex items-center gap-2">
                            <Radar size={16} className="text-cyan-300" />
                            Flights, rail, and bus search
                        </span>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.65 }}
                    className="landing-console relative rounded-3xl border border-white/10 p-4 shadow-2xl shadow-cyan-950/50 sm:p-5"
                >
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                            LIVE RESCUE PLAN
                        </span>
                    </div>

                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-rose-400/15 p-2 text-rose-300">
                                <TriangleAlert size={20} />
                            </div>

                            <div>
                                <p className="font-bold text-white">
                                    Flight cancelled · CCU → DEL
                                </p>
                                <p className="mt-1 text-sm text-rose-100/70">
                                    Arrival deadline: tomorrow, 10:00 AM
                                </p>
                            </div>

                            <span className="ml-auto rounded-full bg-rose-400/15 px-2 py-1 text-[10px] font-bold text-rose-200">
                                CRITICAL
                            </span>
                        </div>
                    </div>

                    <div className="my-4 space-y-3">
                        <p className="px-1 text-xs font-bold tracking-[.14em] text-slate-500">
                            AGENT IS REPLANNING
                        </p>

                        {[
                            'Scanning flights, rail & bus schedules',
                            'Testing connections against deadline',
                            'Ranking cost, speed & risk',
                        ].map((step, index) => (
                            <div key={step} className="flex items-center gap-3 text-sm">
                                <span
                                    className={`flex h-7 w-7 items-center justify-center rounded-full ${index === 2
                                            ? 'bg-cyan-300 text-slate-950'
                                            : 'bg-emerald-400/15 text-emerald-300'
                                        }`}
                                >
                                    {index < 2 ? (
                                        <CheckCircle2 size={15} />
                                    ) : (
                                        <Bot size={15} className="animate-pulse" />
                                    )}
                                </span>
                                <span className="text-slate-300">{step}</span>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-cyan-300/25 bg-slate-950/55 p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-cyan-200">
                                BEST RECOVERY
                            </span>
                            <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-300">
                                LOW RISK
                            </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-white">
                            <span>CCU</span>
                            <span className="h-px flex-1 bg-gradient-to-r from-cyan-300 to-blue-500" />
                            <Plane size={16} className="text-cyan-300" />
                            <span className="h-px flex-1 bg-gradient-to-r from-blue-500 to-cyan-300" />
                            <span>DEL</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="landing-route-chip text-cyan-200">
                                <Plane size={13} /> Flight
                            </span>
                            <span className="landing-route-chip text-violet-200">
                                <TrainFront size={13} /> Train
                            </span>
                            <span className="landing-route-chip text-orange-200">
                                <BusFront size={13} /> Bus
                            </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                                <p className="text-slate-500">Arrival</p>
                                <p className="mt-1 font-bold text-white">06:40 AM</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Budget</p>
                                <p className="mt-1 font-bold text-white">₹7,450</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Buffer</p>
                                <p className="mt-1 font-bold text-emerald-300">3h 20m</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            <section className="relative mx-auto max-w-6xl py-10">
                <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/[.035] p-4 sm:grid-cols-3 sm:p-5">
                    {capabilities.map(({ icon: Icon, title, detail, color }) => (
                        <motion.div
                            whileHover={{ y: -5, scale: 1.02 }}
                            key={title}
                            className="landing-capability flex items-center gap-3 rounded-xl p-3"
                        >
                            <div className={`rounded-xl bg-white/5 p-2.5 ${color}`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-white">{title}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            <section id="how-it-works" className="relative mx-auto max-w-6xl py-24">
                <div className="mb-12 max-w-2xl">
                    <p className="text-xs font-bold tracking-[.18em] text-cyan-300">
                        THE RESCUE LOOP
                    </p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
                        A travel planner recommends.
                        <br />
                        A rescue agent adapts.
                    </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    {rescueSteps.map(({ icon: Icon, title, text }, index) => (
                        <motion.div
                            whileHover={{ y: -8 }}
                            key={title}
                            className="landing-feature-card rounded-2xl p-5"
                        >
                            <span className="text-xs font-black text-cyan-300/60">
                                0{index + 1}
                            </span>
                            <div className="mt-5 text-cyan-200">
                                <Icon size={27} />
                            </div>
                            <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            <section id="about-us" className="relative mx-auto max-w-6xl py-12">
                <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-7 sm:p-10">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 text-cyan-200">
                            <Users size={18} />
                            <span className="text-xs font-bold tracking-[.18em]">
                                BUILT FOR THE HACKATHON
                            </span>
                        </div>

                        <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
                            The team behind TravelOps
                        </h2>

                        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
                            We are building a calmer, smarter way to recover when travel
                            plans suddenly change.
                        </p>
                    </div>

                    <div className="mt-9 grid gap-4 sm:grid-cols-3">
                        {team.map((member) => (
                            <motion.div
                                whileHover={{ y: -7, scale: 1.02 }}
                                key={member.name}
                                className="landing-team-card rounded-2xl p-5 text-center"
                            >
                                <div
                                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${member.accent} text-lg font-black text-white shadow-lg`}
                                >
                                    {member.initials}
                                </div>
                                <h3 className="mt-4 font-bold text-white">{member.name}</h3>
                                <p className="mt-1 text-xs text-slate-400">
                                    TravelOps Builder
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="relative mx-auto max-w-6xl pb-16 pt-12">
                <div className="landing-cta rounded-3xl p-8 text-center sm:p-14">
                    <Sparkles className="mx-auto text-cyan-200" size={28} />

                    <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
                        Your trip can break.
                        <br />
                        Your plan doesn&apos;t have to.
                    </h2>

                    <p className="mx-auto mt-5 max-w-xl text-slate-300">
                        Give the agent your origin, destination, deadline, and budget. It
                        will compare flight, train, and bus recovery options for you.
                    </p>

                    <Link className="landing-action mt-8 inline-block" href="/crisis/new">
                        <Button
                            size="lg"
                            variant="primary"
                            icon={<ArrowRight size={18} />}
                        >
                            Start a rescue plan
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}